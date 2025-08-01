import { Router } from 'express';
import { LighthouseController } from '../controllers/lighthouse-controller';

const router = Router();
const lighthouseController = new LighthouseController();

/**
 * Lighthouse 테스트 실행
 * POST /api/lighthouse/run
 */
router.post('/run', async (req, res) => {
  await lighthouseController.runLighthouseTest(req, res);
});

/**
 * Lighthouse 테스트 상태 조회
 * GET /api/lighthouse/status/:testId
 */
router.get('/status/:testId', async (req, res) => {
  await lighthouseController.getLighthouseTestStatus(req, res);
});

/**
 * Lighthouse 테스트 취소
 * DELETE /api/lighthouse/cancel/:testId
 */
router.delete('/cancel/:testId', async (req, res) => {
  await lighthouseController.cancelLighthouseTest(req, res);
});

/**
 * 실행 중인 Lighthouse 테스트 목록 조회
 * GET /api/lighthouse/running
 */
router.get('/running', async (req, res) => {
  await lighthouseController.getRunningLighthouseTests(req, res);
});

export default router; 