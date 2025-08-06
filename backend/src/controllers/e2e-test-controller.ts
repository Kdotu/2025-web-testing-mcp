import { Request, Response, NextFunction } from 'express';
import { E2ETestService } from '../services/e2e-test-service';
import { TestResultService } from '../services/test-result-service';
import { createValidationError } from '../middleware/error-handler';

export class E2ETestController {
  private e2eTestService: E2ETestService;

  constructor() {
    const testResultService = new TestResultService();
    this.e2eTestService = new E2ETestService(testResultService);
  }

  /**
   * E2E 테스트 실행
   */
  executeE2ETest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url, name, description, config } = req.body;

      // 기본 검증
      if (!url || !name) {
        throw createValidationError('URL과 이름은 필수입니다.');
      }

      const result = await this.e2eTestService.executeE2ETest({
        url,
        name,
        description,
        config
      });
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'E2E 테스트가 시작되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * E2E 테스트 상태 조회
   */
  getE2ETestStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { testId } = req.params;

      if (!testId) {
        throw createValidationError('테스트 ID가 필요합니다.');
      }

      const result = await this.e2eTestService.getE2ETestStatus(testId);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * E2E 테스트 취소
   */
  cancelE2ETest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { testId } = req.params;

      if (!testId) {
        throw createValidationError('테스트 ID가 필요합니다.');
      }

      await this.e2eTestService.cancelE2ETest(testId);
      
      res.json({
        success: true,
        message: 'E2E 테스트가 취소되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
} 