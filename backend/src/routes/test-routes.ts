import { Router, Request, Response, NextFunction } from 'express';
import { TestManageController } from '../controllers/test-manage-controller';
import { createValidationError } from '../middleware/error-handler';
import { LoadTestConfig } from '../types';

const router = Router();
const testManageController = new TestManageController();

// ==================== E2E 테스트 관련 ====================

/**
 * E2E 테스트 실행
 * POST /api/test/e2e
 */
router.post('/e2e', testManageController.executeE2ETest);

// ==================== Lighthouse 테스트 관련 ====================

/**
 * Lighthouse 테스트 실행
 * POST /api/test/lighthouse
 */
router.post('/lighthouse', async (req: Request, res: Response) => {
  await testManageController.runLighthouseTest(req, res);
});

// ==================== Load 테스트 관련 ====================

/**
 * 새로운 부하 테스트 실행 요청
 * POST /api/test/load
 */
router.post('/load', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config: LoadTestConfig = req.body;
    
    // 기본 검증
    if (!config.url || !config.name || !config.stages) {
      throw createValidationError('URL, name, and stages are required');
    }

    if (!Array.isArray(config.stages) || config.stages.length === 0) {
      throw createValidationError('At least one stage is required');
    }

    // TestManageController를 통해 테스트 생성
    const result = await testManageController.createLoadTest(config);
    
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
 * k6 MCP 테스트 실행 (직접 실행 방식)
 * POST /api/test/load/k6-mcp-direct
 */
router.post('/load/k6-mcp-direct', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, name, description, script, config } = req.body;
    
    // 기본 검증
    if (!url || !name || !script) {
      throw createValidationError('URL, name, and script are required');
    }

    const result = await testManageController.executeK6MCPTestDirect({
      url,
      name,
      description,
      script,
      config
    });
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'k6 MCP test executed successfully (direct mode)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * k6 MCP 테스트 실행 (MCP 서버 방식)
 * POST /api/test/load/k6-mcp
 */
router.post('/load/k6-mcp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, name, description, script, config } = req.body;
    
    // 기본 검증
    if (!url || !name || !script) {
      throw createValidationError('URL, name, and script are required');
    }

    const result = await testManageController.executeK6MCPTest({
      url,
      name,
      description,
      script,
      config
    });
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'k6 MCP test executed successfully (MCP server mode)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 공통 테스트 관리 ====================

/**
 * 테스트 상태 조회 (공통)
 * GET /api/test/status/:testId?testType=e2e|lighthouse|load
 */
router.get('/status/:testId', testManageController.getTestStatus);

/**
 * 테스트 취소 (공통)
 * DELETE /api/test/cancel/:testId?testType=e2e|lighthouse|load
 */
router.delete('/cancel/:testId', testManageController.cancelTest);

/**
 * 테스트 상태 업데이트 (공통)
 * PUT /api/test/status/:testId
 */
router.put('/status/:testId', testManageController.updateTestStatus);

export default router; 