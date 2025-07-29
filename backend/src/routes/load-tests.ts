import { Router, Request, Response, NextFunction } from 'express';
import { LoadTestController } from '../controllers/load-test-controller';
import { createValidationError } from '../middleware/error-handler';
import { LoadTestConfig } from '../types';

const router = Router();
const loadTestController = new LoadTestController();

/**
 * POST /api/load-tests
 * 새로운 부하 테스트 실행 요청
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config: LoadTestConfig = req.body;
    
    // 기본 검증
    if (!config.url || !config.name || !config.stages) {
      throw createValidationError('URL, name, and stages are required');
    }

    if (!Array.isArray(config.stages) || config.stages.length === 0) {
      throw createValidationError('At least one stage is required');
    }

    const result = await loadTestController.createTest(config);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Load test created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/load-tests/:id
 * 특정 테스트 상태 조회
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw createValidationError('Test ID is required');
    }
    const result = await loadTestController.getTestStatus(id);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/load-tests/:id/results
 * 테스트 결과 조회
 */
router.get('/:id/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw createValidationError('Test ID is required');
    }
    const result = await loadTestController.getTestResults(id);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/load-tests/:id
 * 테스트 중단
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw createValidationError('Test ID is required');
    }
    await loadTestController.cancelTest(id);
    
    res.json({
      success: true,
      message: 'Test cancelled successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export { router as loadTestRoutes }; 