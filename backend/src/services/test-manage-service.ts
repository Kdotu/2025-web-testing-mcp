import { TestResultService } from './test-result-service';

/**
 * 테스트 관리 공통 서비스
 * 모든 테스트 타입의 공통 기능을 통합 관리
 */
export class TestManageService {
  private testResultService: TestResultService;

  constructor() {
    this.testResultService = new TestResultService();
  }

  /**
   * 테스트 상태 조회 (공통)
   * testType에 관계없이 m2_test_results 테이블에서 조회
   */
  async getTestStatus(testId: string): Promise<any> {
    try {
      const result = await this.testResultService.getResultByTestId(testId);
      
      if (!result) {
        return {
          testId,
          status: 'not_found',
          currentStep: '테스트를 찾을 수 없습니다',
          message: `Test ${testId} not found`,
          timestamp: new Date().toISOString()
        };
      }

      return {
        testId,
        status: result.status,
        currentStep: result.currentStep || '테스트 진행 중...',
        message: `Test ${result.status}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('테스트 상태 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 테스트 취소 (공통)
   * testType에 관계없이 m2_test_results 테이블의 status만 업데이트
   */
  async cancelTest(testId: string): Promise<void> {
    try {
      const result = await this.testResultService.getResultByTestId(testId);
      
      if (!result) {
        console.log(`테스트 ${testId}를 찾을 수 없습니다.`);
        return;
      }

      // 상태를 cancelled로 업데이트
      result.status = 'cancelled';
      result.updatedAt = new Date().toISOString();
      
      // 요약 정보에 종료 시간 추가
      if (!result.summary) {
        result.summary = {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          duration: 0,
          startTime: result.createdAt || new Date().toISOString(),
          endTime: new Date().toISOString()
        };
      } else {
        result.summary.endTime = new Date().toISOString();
      }

      await this.testResultService.updateResult(result);
      
      console.log(`테스트 ${testId}가 취소되었습니다.`);
    } catch (error) {
      console.error('테스트 취소 실패:', error);
      throw error;
    }
  }

  /**
   * 테스트 상태 업데이트 (공통)
   * testType에 관계없이 m2_test_results 테이블의 status 업데이트
   */
  async updateTestStatus(
    testId: string,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'stopped',
    currentStep?: string,
    message?: string
  ): Promise<void> {
    try {
      const result = await this.testResultService.getResultByTestId(testId);
      
      if (!result) {
        console.log(`테스트 ${testId}를 찾을 수 없습니다.`);
        return;
      }

      // 상태 업데이트
      result.status = status;
      result.updatedAt = new Date().toISOString();
      
      // currentStep이 제공된 경우 업데이트
      if (currentStep) {
        result.currentStep = currentStep;
      }

      // 테스트가 완료된 경우 종료 시간 추가
      if (status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'stopped') {
        if (!result.summary) {
          result.summary = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            duration: 0,
            startTime: result.createdAt || new Date().toISOString(),
            endTime: new Date().toISOString()
          };
        } else {
          result.summary.endTime = new Date().toISOString();
        }
      }

      await this.testResultService.updateResult(result);
      
      // 상태 업데이트 로깅
      if (message) {
        console.log(`테스트 ${testId} 상태가 ${status}로 업데이트되었습니다: ${message}`);
      } else {
        console.log(`테스트 ${testId} 상태가 ${status}로 업데이트되었습니다.`);
      }
    } catch (error) {
      console.error('테스트 상태 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 실행 중인 테스트 목록 조회 (공통)
   */
  async getRunningTests(): Promise<any[]> {
    try {
      return await this.testResultService.getRunningTests();
    } catch (error) {
      console.error('실행 중인 테스트 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 테스트 결과 삭제 (공통)
   */
  async deleteTestResult(testId: string): Promise<void> {
    try {
      await this.testResultService.deleteResult(testId);
      console.log(`테스트 결과 ${testId}가 삭제되었습니다.`);
    } catch (error) {
      console.error('테스트 결과 삭제 실패:', error);
      throw error;
    }
  }
} 