import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { E2ETestConfig, E2ETestLocalResult, LoadTestResult } from '../types';
import { TestResultService } from './test-result-service';
// import { TestTypeService } from './test-type-service';

/**
 * E2E 테스트 서비스 (Playwright MCP 서버 방식)
 */
export class E2ETestService {
  private runningTests: Map<string, E2ETestLocalResult> = new Map();
  private tempDir: string;
  // private testTypeService: TestTypeService;

  constructor(private testResultService: TestResultService) {
    this.tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    // this.testTypeService = new TestTypeService();
  }

  /**
   * E2E 테스트 실행 (MCP 서버 방식)
   */
  async executeE2ETest(config: E2ETestConfig, dbTestId?: string): Promise<E2ETestLocalResult> {
    const testId = dbTestId || uuidv4();
    
    // 테스트 타입 잠금 시스템 제거로 인해 더 이상 사용하지 않음
    // const testTypeId = this.getTestTypeId();

    const testResult: E2ETestLocalResult = {
      id: testId,
      url: config.url,
      name: config.name,
      status: 'running',
      startTime: new Date().toISOString(),
      logs: [],
      ...(config.description && { description: config.description })
    };

    this.runningTests.set(testId, testResult);

    try {
      // DB에 초기 결과 저장 - TestManageController에서 이미 처리됨
      // await this.saveInitialResult(testId, config);

      // Playwright MCP 서버를 사용하여 E2E 테스트 실행
      this.runPlaywrightViaMCP(testId, config);

      return testResult;
    } catch (error) {
      // 에러 발생 시 처리
      throw error;
    }
  }

  // 테스트 타입 잠금 시스템 제거로 인해 더 이상 사용하지 않음
  // /**
  //  * 테스트 타입 ID 생성
  //  */
  // private getTestTypeId(): string {
  //   // Playwright E2E 테스트 타입 사용
  //   return 'playwright';
  // }

  /**
   * Playwright MCP 서버를 통한 E2E 테스트 실행
   */
  private async runPlaywrightViaMCP(testId: string, config: E2ETestConfig) {
    const testResult = this.runningTests.get(testId);
    if (!testResult) return;

    try {
      testResult.logs.push('Playwright MCP 서버를 통해 테스트를 시작합니다...');

      // Playwright MCP 서버를 통해 테스트 실행
      const result = await this.executePlaywrightViaMCP(config);
      console.log('Playwright MCP result:', result);

      // 결과 처리
      await this.parsePlaywrightOutput(testId, result, config);
      
      // 테스트 완료 시 상태 업데이트
      await this.handleTestCompletion(testId, 'completed');

    } catch (error) {
      console.error('Failed to execute Playwright test via MCP:', error);
      await this.handleTestCompletion(testId, 'failed');
      throw error;
    }
  }

  /**
   * Playwright MCP 서버를 통한 테스트 실행
   */
  private async executePlaywrightViaMCP(config: E2ETestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`[MCP] Starting Playwright test via MCP server`);
      console.log(`[MCP] Config: url=${config.url}, settings=${JSON.stringify(config.config.settings)}`);
      
      // Playwright MCP 서버 경로 설정
      const playwrightServerPath = path.join(process.cwd(), 'mcp', 'playwright-mcp-server');
      const isWindows = process.platform === 'win32';
      const nodePath = isWindows ? 'node' : 'node';
      
      console.log(`[MCP] Node path: ${nodePath}`);
      console.log(`[MCP] Working directory: ${playwrightServerPath}`);
      
      // Node.js Playwright MCP 서버 프로세스 시작 (1회성 실행)
      const nodeProcess = spawn(nodePath, ['playwright_server.js'], {
        cwd: playwrightServerPath,
        env: {
          ...process.env,
          PLAYWRIGHT_BROWSER: config.config.settings?.browser || 'chromium'
        }
      });

      console.log(`[MCP] Node process started with PID: ${nodeProcess.pid}`);

      let output = '';
      let errorOutput = '';

      // MCP 서버 출력 처리
      nodeProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log(`[MCP] stdout: ${dataStr.trim()}`);
      });

      nodeProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        console.error(`[MCP] stderr: ${dataStr.trim()}`);
      });

      // MCP 서버 종료 처리
      nodeProcess.on('close', (code) => {
        console.log(`[MCP] Process exited with code: ${code}`);
        console.log(`[MCP] Total stdout length: ${output.length}`);
        console.log(`[MCP] Total stderr length: ${errorOutput.length}`);
        
        try {
          // JSON 응답 파싱
          const response = JSON.parse(output);
          console.log(`[MCP] Parsed response:`, response);
          
          if (response.error) {
            console.error(`[MCP] Server returned error: ${response.error}`);
            reject(new Error(`MCP server error: ${response.error}`));
          } else if (response.result) {
            console.log(`[MCP] Successfully received result`);
            resolve(response.result);
          } else {
            console.error(`[MCP] Invalid response format`);
            reject(new Error('MCP server returned invalid response format'));
          }
        } catch (parseError) {
          console.error('[MCP] Failed to parse response:', parseError);
          console.error('[MCP] Raw output:', output);
          reject(new Error(`Failed to parse MCP server response: ${output}`));
        }
      });

      nodeProcess.on('error', (error) => {
        console.error('[MCP] Process error:', error);
        reject(error);
      });

      // MCP 서버에 테스트 요청 전송 (JSON 형태)
      const testRequest = {
        method: 'run_test',
        params: {
          url: config.url,
          config: config.config.settings || {}
        }
      };

      console.log(`[MCP] Sending request:`, JSON.stringify(testRequest));
      
      // 요청을 JSON 형태로 전송
      nodeProcess.stdin.write(JSON.stringify(testRequest) + '\n');
      nodeProcess.stdin.end();
    });
  }

  /**
   * Playwright 결과 파싱
   */
  private async parsePlaywrightOutput(testId: string, result: any, config: E2ETestConfig): Promise<void> {
    try {
      console.log('Parsing Playwright output...');
      
      const testResult = this.runningTests.get(testId);
      if (!testResult) return;

      // 결과에서 로그 추출
      if (result.logs && Array.isArray(result.logs)) {
        testResult.logs.push(...result.logs);
      }

      // 성공/실패 상태 확인
      if (result.success === true) {
        testResult.status = 'completed';
        testResult.endTime = new Date().toISOString();
        testResult.logs.push('E2E 테스트가 성공적으로 완료되었습니다.');
      } else {
        testResult.status = 'failed';
        testResult.endTime = new Date().toISOString();
        testResult.error = result.error || 'E2E 테스트가 실패했습니다.';
        testResult.logs.push(`E2E 테스트가 실패했습니다: ${testResult.error}`);
      }

      // 성능 메트릭 추출
      const performanceMetrics = result.data?.performanceMetrics || result.performanceMetrics || {};
      
      // raw_data에 Playwright 결과 데이터 포함
      const rawData = {
        logs: testResult.logs,
        config: config,
        playwrightResult: result,
        performanceMetrics: performanceMetrics,
        browser: result.data?.browser || result.browser || 'chromium',
        url: result.data?.url || result.url || config.url,
        timestamp: result.data?.timestamp || result.timestamp || new Date().toISOString()
      };

      // DB 업데이트 (성능 메트릭 포함)
      await this.updateTestResult(testId, testResult.status, testResult.logs, config, rawData, performanceMetrics);
      console.log(`[E2E Test ${testId}] 테스트 완료 - DB 업데이트 완료`);

    } catch (error) {
      console.error('Failed to parse Playwright output:', error);
      throw error;
    }
  }

  /**
   * 테스트 완료 처리
   */
  private async handleTestCompletion(testId: string, status: 'running' | 'completed' | 'failed' | 'cancelled') {
    const result = this.runningTests.get(testId);
    if (result) {
      result.status = status;
      result.endTime = new Date().toISOString();
      this.runningTests.set(testId, result);
      
      // 테스트 완료 시 처리
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        console.log(`E2E test ${testId} completed with status: ${status}`);
      }
    }
    this.cleanupTempFiles(testId);
  }

  /**
   * 초기 결과 저장 - TestManageController에서 이미 처리됨으로 주석 처리
   */
  /*
  private async saveInitialResult(testId: string, config: E2ETestConfig): Promise<void> {
    const initialResult = {
      id: testId,
      testId: `e2e_${Date.now()}`,
      testType: 'e2e',
      url: config.url,
      name: config.name,
      description: config.description || '',
      status: 'running' as const,
      startTime: new Date().toISOString(),
      config: {
        testType: 'e2e',
        settings: config.config.settings || {}
      },
      metrics: {
        http_req_duration: {
          avg: 0,
          min: 0,
          max: 0,
          p95: 0
        },
        http_req_rate: 0,
        http_req_failed: 0,
        vus: 0,
        vus_max: 0
      },
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        duration: 0,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.testResultService.saveResult(initialResult);
  }
  */

  /**
   * 테스트 결과 업데이트
   */
  private async updateTestResult(testId: string, status: 'running' | 'completed' | 'failed' | 'cancelled', logs: string[], config: E2ETestConfig, rawData?: any, metrics?: any): Promise<void> {
    const result = this.runningTests.get(testId);
    if (!result) return;

    // 기존 결과를 가져와서 업데이트
    const existingResult = await this.testResultService.getResultByTestId(testId);
    if (!existingResult) return;

    // raw_data 구성
    const rawDataToSave = rawData || { logs, config };

    // 성능 메트릭을 Playwright 형식에 맞게 변환
    const playwrightMetrics = {
      loadTime: metrics?.loadTime || 0,
      domContentLoaded: metrics?.domContentLoaded || 0,
      firstPaint: metrics?.firstPaint || 0,
      firstContentfulPaint: metrics?.firstContentfulPaint || 0
    };

    const updatedResult: LoadTestResult = {
      ...existingResult,
      status,
      metrics: {
        ...existingResult.metrics,
        ...playwrightMetrics
      },
      summary: {
        ...existingResult.summary,
        endTime: new Date().toISOString()
      },
      raw_data: JSON.stringify(rawDataToSave),
      updatedAt: new Date().toISOString()
    };

    await this.testResultService.updateResult(updatedResult);
  }

  /**
   * 임시 파일 정리
   */
  private async cleanupTempFiles(testId: string): Promise<void> {
    try {
      const scriptPath = path.join(this.tempDir, `${testId}.js`);
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    } catch (error) {
      console.error(`Failed to cleanup temp files for test ${testId}:`, error);
    }
  }

  /**
   * 실행 중인 테스트 조회
   */
  getRunningTest(testId: string): E2ETestLocalResult | undefined {
    return this.runningTests.get(testId);
  }

  /**
   * 모든 실행 중인 테스트 조회
   */
  getAllRunningTests(): E2ETestLocalResult[] {
    return Array.from(this.runningTests.values());
  }

  /**
   * E2E 테스트 상태 조회
   */
  async getE2ETestStatus(testId: string): Promise<E2ETestLocalResult | null> {
    return this.runningTests.get(testId) || null;
  }

  /**
   * E2E 테스트 취소
   */
  async cancelE2ETest(testId: string): Promise<void> {
    const testResult = this.runningTests.get(testId);
    if (testResult && testResult.status === 'running') {
      testResult.status = 'cancelled';
      testResult.endTime = new Date().toISOString();
      testResult.logs.push('사용자에 의해 테스트가 취소되었습니다.');
      
      // raw_data 구성
      const rawData = {
        logs: testResult.logs,
        config: {
          url: testResult.url,
          name: testResult.name,
          ...(testResult.description && { description: testResult.description }),
          config: { testType: 'e2e', settings: {} }
        },
        cancelled: true,
        cancelledAt: new Date().toISOString()
      };
      
      // DB 업데이트
      await this.updateTestResult(testId, 'cancelled', testResult.logs, {
        url: testResult.url,
        name: testResult.name,
        ...(testResult.description && { description: testResult.description }),
        config: { testType: 'e2e', settings: {} }
      }, rawData);
    }
  }
} 