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
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
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
    const result = await this.testResultService.getResultByTestId(testId);
    
    if (!result) {
      throw createNotFoundError('Test');
    }

    return {
      testId,
      status: result.status,
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
} 