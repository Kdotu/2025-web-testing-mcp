import { Router, Request, Response, NextFunction } from 'express';
import { TestResultController } from '../controllers/test-result-controller';

const router = Router();
const testResultController = new TestResultController();

/**
 * GET /api/test-results
 * 모든 테스트 결과 조회
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '10', status } = req.query;
    const result = await testResultController.getAllResults({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as string
    });
    
    res.json({
      success: true,
      data: result.results, // results 배열만 전달
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/test-results/:id
 * 특정 테스트 결과 조회
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error('Result ID is required');
    }
    const result = await testResultController.getResultById(id);
    
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
 * DELETE /api/test-results/:id
 * 테스트 결과 삭제
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error('Result ID is required');
    }
    await testResultController.deleteResult(id);
    
    res.json({
      success: true,
      message: 'Test result deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export { router as testResultRoutes }; 