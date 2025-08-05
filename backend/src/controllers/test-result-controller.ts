import { LoadTestResult } from '../types';
import { TestResultService } from '../services/test-result-service';
import { createNotFoundError } from '../middleware/error-handler';

interface GetAllResultsOptions {
  page: number;
  limit: number;
  status?: string;
}

/**
 * 테스트 결과 컨트롤러
 */
export class TestResultController {
  private testResultService: TestResultService;

  constructor() {
    this.testResultService = new TestResultService();
  }

  /**
   * 모든 테스트 결과 조회 (페이지네이션 지원)
   */
  async getAllResults(options: GetAllResultsOptions): Promise<{
    results: LoadTestResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { results, total } = await this.testResultService.getAllResults(options);
    
    const totalPages = Math.ceil(total / options.limit);
    
    return {
      results,
      total,
      page: options.page,
      limit: options.limit,
      totalPages
    };
  }

  /**
   * 특정 테스트 결과 조회
   */
  async getResultById(id: string): Promise<LoadTestResult> {
    const result = await this.testResultService.getResultById(id);
    
    if (!result) {
      throw createNotFoundError('Test result');
    }

    return result;
  }

  /**
   * 테스트 결과 삭제
   */
  async deleteResult(id: string): Promise<void> {
    const result = await this.testResultService.getResultById(id);
    
    if (!result) {
      throw createNotFoundError('Test result');
    }

    await this.testResultService.deleteResult(id);
  }

  /**
   * 전체 테스트 결과 개수 조회
   */
  async getTotalCount(): Promise<{ total: number }> {
    const total = await this.testResultService.getTotalCount();
    return { total };
  }

  /**
   * 테스트 결과 통계 조회
   */
  async getStatistics(): Promise<{
    totalTests: number;
    completedTests: number;
    failedTests: number;
    averageResponseTime: number;
    averageErrorRate: number;
  }> {
    const stats = await this.testResultService.getStatistics();
    return stats;
  }
} 