import { Router } from 'express';
import { PlaywrightTestController } from '../controllers/playwright-test-controller';

const router = Router();
const playwrightController = new PlaywrightTestController();

/**
 * POST /api/playwright/execute
 * 테스트 시나리오 실행 (Phase 1-4 전체 플로우)
 */
router.post('/execute', async (req, res) => {
  await playwrightController.executeTestScenario(req, res);
});

/**
 * GET /api/playwright/status/:executionId
 * 실행 상태 조회 (Phase 3 모니터링)
 */
router.get('/status/:executionId', async (req, res) => {
  await playwrightController.getTestExecutionStatus(req, res);
});

/**
 * GET /api/playwright/results/:executionId
 * 실행 결과 조회 (Phase 4 완료 후)
 */
router.get('/results/:executionId', async (req, res) => {
  await playwrightController.getTestExecutionResult(req, res);
});

/**
 * POST /api/playwright/validate
 * 테스트 시나리오 검증 (실행 전)
 */
router.post('/validate', async (req, res) => {
  await playwrightController.validateTestScenario(req, res);
});

/**
 * GET /api/playwright/mcp/status
 * MCP 서버 상태 확인
 */
router.get('/mcp/status', async (req, res) => {
  await playwrightController.checkMCPStatus(req, res);
});

export default router;
