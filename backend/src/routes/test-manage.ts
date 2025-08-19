import { Router } from 'express';
import { TestManageController } from '../controllers/test-manage-controller';

const router = Router();
const testManageController = new TestManageController();

/**
 * 테스트 상태 조회 (공통)
 * GET /api/test-manage/status/:testId?testType=e2e|lighthouse|load
 */
router.get('/status/:testId', (req, res, next) => testManageController.getTestStatus(req, res, next));

/**
 * 테스트 취소 (공통)
 * DELETE /api/test-manage/cancel/:testId?testType=e2e|lighthouse|load
 */
router.delete('/cancel/:testId', (req, res, next) => testManageController.cancelTest(req, res, next));

/**
 * 테스트 상태 업데이트 (공통)
 * PUT /api/test-manage/status/:testId
 */
router.put('/status/:testId', (req, res, next) => testManageController.updateTestStatus(req, res, next));

export default router; 