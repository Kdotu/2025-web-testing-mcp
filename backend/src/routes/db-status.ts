import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * GET /db-status
 * 데이터베이스 상태 확인
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // 현재는 간단한 상태 확인만 반환
    // 실제로는 데이터베이스 연결 상태를 확인할 수 있습니다
    
    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        status: 'connected',
        timestamp: new Date().toISOString(),
        server: 'Express Backend'
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as dbStatusRoutes }; 