import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * POST /save-settings
 * 설정 저장
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = req.body;
    
    // 여기서 설정을 저장하는 로직을 구현할 수 있습니다
    // 현재는 성공 응답만 반환
    
    res.json({
      success: true,
      data: settings,
      message: 'Settings saved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export { router as saveSettingsRoutes }; 