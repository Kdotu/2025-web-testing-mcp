import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * GET /get-settings
 * 설정 조회
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // 기본 설정 반환
    const defaultSettings = {
      apiUrl: process.env['VITE_API_BASE_URL'] || 'http://localhost:3101',
      demoMode: false,
      autoRefresh: true,
      refreshInterval: 5000,
      maxResults: 1000,
      theme: 'light',
      language: 'ko'
    };
    
    res.json({
      success: true,
      data: defaultSettings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /get-settings
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

export { router as settingsRoutes }; 