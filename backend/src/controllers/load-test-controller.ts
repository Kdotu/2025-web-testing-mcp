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
      progress: result.progress,
      currentStep: result.currentStep
    });

    // DB에서 저장된 진행률과 현재 단계 사용
    let progress = result.progress || 0;
    let currentStep = result.currentStep || '테스트 준비 중...';
    
    if (result.status === 'running') {
      // k6 서비스에서 실행 중인지 확인
      const isRunning = this.k6Service.isTestRunning(testId);
      console.log(`k6 service isRunning for ${testId}:`, isRunning);
      
      if (!isRunning && progress === 0) {
        // 아직 시작되지 않은 경우
        progress = 0;
        currentStep = '테스트 준비 중...';
      }
      // 이미 DB에 저장된 progress와 currentStep 사용
    } else if (result.status === 'completed') {
      progress = 100;
      currentStep = '테스트 완료';
    } else if (result.status === 'failed') {
      progress = 100;
      currentStep = '테스트 실패';
    }

    const response = {
      testId,
      status: result.status,
      progress,
      currentStep,
      message: `Test ${result.status}`,
      timestamp: new Date().toISOString()
    };
    
    console.log(`Test status response for ${testId}:`, response);
    return response;
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
    
    // 상태 업데이트
    await this.updateTestStatus(testId, 'cancelled', 'Test cancelled by user');
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
   * k6 MCP 테스트 실행
   */
  async executeK6MCPTest(params: {
    url: string;
    name: string;
    description?: string;
    script: string;
    config: {
      duration: string;
      vus: number;
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

    // 초기 테스트 결과 생성
    const initialResult: LoadTestResult = {
      id: uuidv4(),
      testId,
      testType: 'load', // 부하테스트로 설정
      url: params.url,
      config: {
        id: testId,
        url: params.url,
        name: params.name,
        description: params.description,
        stages: [], // k6 MCP에서는 stages를 직접 사용하지 않음
        createdAt: now,
        updatedAt: now
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

    // k6 MCP 테스트 실행 (비동기) - URL 정보 포함
    this.executeK6MCPTestAsync(testId, scriptPath, params.config, params.url).catch(error => {
      console.error('k6 MCP test execution failed:', error);
      this.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
    });

    return initialResult;
  }

  /**
   * k6 MCP 테스트 비동기 실행
   */
  private async executeK6MCPTestAsync(
    testId: string, 
    _scriptPath: string, 
    _config: { duration: string; vus: number },
    url: string
  ): Promise<void> {
    try {
      // k6 서비스를 통해 MCP 테스트 실행 (URL 포함)
      await this.k6Service.executeTest(testId, {
        id: testId,
        url: url, // 실제 URL 전달
        name: 'k6 MCP Test',
        stages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any);

      // 성공 시 상태 업데이트
      await this.updateTestStatus(testId, 'completed', 'k6 MCP test completed successfully');
    } catch (error) {
      console.error('k6 MCP test execution error:', error);
      await this.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
      throw error;
    }
  }
} 