import { LoadTestConfig, LoadTestResult, TestStatusUpdate } from '../types';
import { K6Service } from '../services/k6-service';
import { TestResultService } from '../services/test-result-service';
import { createNotFoundError } from '../middleware/error-handler';
import { v4 as uuidv4 } from 'uuid';

/**
 * 부하 테스트 컨트롤러
 */
export class LoadTestController {
  private k6Service: K6Service;
  private testResultService: TestResultService;

  constructor() {
    this.k6Service = new K6Service();
    this.testResultService = new TestResultService();
  }

  /**
   * 새로운 부하 테스트 생성 및 실행
   */
  async createTest(config: LoadTestConfig): Promise<LoadTestResult> {
    const testId = uuidv4();
    const now = new Date().toISOString();

    // 테스트 설정에 ID 추가
    const testConfig: LoadTestConfig = {
      ...config,
      id: testId,
      createdAt: now,
      updatedAt: now
    };

    // 초기 테스트 결과 생성
    const initialResult: LoadTestResult = {
      id: uuidv4(),
      testId,
      url: config.url,
      config: testConfig,
      status: 'pending',
      metrics: {
        http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
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
        startTime: now,
        endTime: now
      },
      createdAt: now,
      updatedAt: now
    };

    // 데이터베이스에 저장
    await this.testResultService.saveResult(initialResult);

    // k6 테스트 실행 (비동기)
    this.k6Service.executeTest(testId, testConfig).catch(error => {
      console.error('Test execution failed:', error);
      this.updateTestStatus(testId, 'failed', 'Test execution failed');
    });

    return initialResult;
  }

  /**
   * 테스트 상태 조회
   */
  async getTestStatus(testId: string): Promise<TestStatusUpdate> {
    console.log(`Getting test status for: ${testId}`);
    
    const result = await this.testResultService.getResultByTestId(testId);
    
    if (!result) {
      console.log(`Test result not found for: ${testId}`);
      throw createNotFoundError('Test');
    }

    console.log(`Found test result:`, {
      id: result.id,
      status: result.status,
      currentStep: result.currentStep
    });

    // DB에서 저장된 현재 단계 사용
    let currentStep = result.currentStep || '테스트 준비 중...';
    
    if (result.status === 'running') {
      // k6 서비스에서 실행 중인지 확인
      const isRunning = this.k6Service.isTestRunning(testId);
      console.log(`k6 service isRunning for ${testId}:`, isRunning);
      
      if (!isRunning) {
        // k6 서비스에서 실행 중이 아니면 상태를 업데이트
        await this.updateTestStatus(testId, 'completed', 'Test completed');
        currentStep = '테스트 완료';
      }
    }

    return {
      testId,
      status: result.status,
      currentStep: currentStep,
      message: `Test ${result.status}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 테스트 결과 조회
   */
  async getTestResults(testId: string): Promise<LoadTestResult> {
    const result = await this.testResultService.getResultByTestId(testId);
    
    if (!result) {
      throw createNotFoundError('Test result');
    }

    return result;
  }

  /**
   * 테스트 중단
   */
  async cancelTest(testId: string): Promise<void> {
    // k6 서비스에서 테스트 중단
    await this.k6Service.cancelTest(testId);
    
    // 상태 업데이트 - stopped로 변경
    await this.updateTestStatus(testId, 'stopped', 'Test stopped by user');
  }

  /**
   * 타임아웃 테스트 (개발용)
   */
  async testTimeout(testId: string, timeoutMs: number = 30000): Promise<void> {
    await this.k6Service.testTimeout(testId, timeoutMs);
  }

  /**
   * 테스트 상태 업데이트 (내부 메서드)
   */
  private async updateTestStatus(
    testId: string, 
    status: LoadTestResult['status'], 
    _message?: string
  ): Promise<void> {
    const result = await this.testResultService.getResultByTestId(testId);
    
    if (result) {
      result.status = status;
      result.updatedAt = new Date().toISOString();
      
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        result.summary.endTime = new Date().toISOString();
      }
      
      await this.testResultService.updateResult(result);
    }
  }

  /**
   * 테스트 결과 업데이트 (k6 서비스에서 호출)
   */
  async updateTestResult(testId: string, result: Partial<LoadTestResult>): Promise<void> {
    const existingResult = await this.testResultService.getResultByTestId(testId);
    
    if (existingResult) {
      const updatedResult = {
        ...existingResult,
        ...result,
        updatedAt: new Date().toISOString()
      };
      
      await this.testResultService.updateResult(updatedResult);
    }
  }

  /**
   * k6 MCP 테스트 실행 (직접 실행 방식)
   */
  async executeK6MCPTestDirect(params: {
    url: string;
    name: string;
    description?: string;
    script: string;
    config: {
      duration: string;
      vus: number;
      detailedConfig?: any; // 상세 설정 추가
    };
  }): Promise<LoadTestResult> {
    const testId = uuidv4();
    const now = new Date().toISOString();

    // k6 스크립트를 임시 파일로 저장
    const fs = await import('fs');
    const path = await import('path');
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const scriptPath = path.join(tempDir, `${testId}.js`);
    fs.writeFileSync(scriptPath, params.script);

    // 초기 테스트 결과 생성 (설정값 포함)
    const initialResult: LoadTestResult = {
      id: uuidv4(),
      testId,
      testType: 'load', // 부하테스트로 설정
      url: params.url,
      name: params.name,
      ...(params.description && { description: params.description }), // 조건부로 추가
      config: {
        duration: params.config.duration,
        vus: params.config.vus,
        detailedConfig: params.config.detailedConfig || {}
      },
      status: 'running',
      metrics: {
        http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
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
        startTime: now,
        endTime: now
      },
      createdAt: now,
      updatedAt: now
    };

    // 데이터베이스에 저장
    await this.testResultService.saveResult(initialResult);

    // k6 MCP 테스트 실행 (비동기) - 직접 실행 방식
    this.executeK6MCPTestDirectAsync(testId, scriptPath, params.config, params.url).catch(error => {
      console.error('k6 MCP test execution failed:', error);
      this.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
    });

    return initialResult;
  }

  /**
   * k6 MCP 테스트 실행 (MCP 서버 방식)
   */
  async executeK6MCPTest(params: {
    url: string;
    name: string;
    description?: string;
    script: string;
    config: {
      duration: string;
      vus: number;
      detailedConfig?: any; // 상세 설정 추가
    };
  }): Promise<LoadTestResult> {
    const testId = uuidv4();
    const now = new Date().toISOString();

    // k6 스크립트를 임시 파일로 저장
    const fs = await import('fs');
    const path = await import('path');
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const scriptPath = path.join(tempDir, `${testId}.js`);
    fs.writeFileSync(scriptPath, params.script);

    // 초기 테스트 결과 생성 (설정값 포함)
    const initialResult: LoadTestResult = {
      id: uuidv4(),
      testId,
      testType: 'load', // 부하테스트로 설정
      url: params.url,
      name: params.name,
      ...(params.description && { description: params.description }), // 조건부로 추가
      config: {
        duration: params.config.duration,
        vus: params.config.vus,
        detailedConfig: params.config.detailedConfig || {}
      },
      status: 'running',
      metrics: {
        http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
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
        startTime: now,
        endTime: now
      },
      createdAt: now,
      updatedAt: now
    };

    // 데이터베이스에 저장
    await this.testResultService.saveResult(initialResult);

    // k6 MCP 테스트 실행 (비동기) - MCP 서버 방식
    this.executeK6MCPTestAsync(testId, scriptPath, params.config, params.url).catch(error => {
      console.error('k6 MCP test execution failed:', error);
      this.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
    });

    return initialResult;
  }

  /**
   * k6 MCP 테스트 비동기 실행 (MCP 서버 방식)
   */
  private async executeK6MCPTestAsync(
    testId: string, 
    _scriptPath: string, 
    config: { duration: string; vus: number; detailedConfig?: any },
    url: string
  ): Promise<void> {
    try {
      // k6 서비스를 통해 MCP 서버 방식으로 테스트 실행
      await this.k6Service.executeTestViaMCP(testId, {
        id: testId,
        url: url,
        targetUrl: url, // targetUrl 필드 추가
        name: 'k6 MCP Test',
        duration: config.duration,
        vus: config.vus,
        detailedConfig: config.detailedConfig,
        stages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any);

      // 테스트가 성공적으로 완료되었을 때만 completed 상태로 업데이트
      console.log('k6 MCP server test completed successfully, updating status to completed');
    } catch (error) {
      console.error('k6 MCP server test execution error:', error);
      await this.updateTestStatus(testId, 'failed', 'k6 MCP server test execution failed');
      throw error;
    }
  }

  /**
   * k6 MCP 테스트 비동기 실행 (직접 실행 방식)
   */
  private async executeK6MCPTestDirectAsync(
    testId: string, 
    _scriptPath: string, 
    config: { duration: string; vus: number; detailedConfig?: any },
    url: string
  ): Promise<void> {
    try {
      // k6 서비스를 통해 MCP 테스트 실행 (올바른 config 구조 전달)
      await this.k6Service.executeTest(testId, {
        id: testId,
        url: url,
        targetUrl: url, // targetUrl 필드 추가
        name: 'k6 MCP Test',
        duration: config.duration,
        vus: config.vus,
        detailedConfig: config.detailedConfig,
        stages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any);

      // 테스트가 성공적으로 완료되었을 때만 completed 상태로 업데이트
      console.log('k6 test completed successfully, updating status to completed');
    } catch (error) {
      console.error('k6 MCP test execution error:', error);
      await this.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
      throw error;
    }
  }
} 