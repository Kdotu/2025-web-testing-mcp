import { Router } from 'express';
import { TestTypeController } from '../controllers/test-type-controller';

const router = Router();
const testTypeController = new TestTypeController();

/**
 * GET /api/test-types
 * 모든 테스트 타입 조회
 */
router.get('/', async (req, res, next) => {
  await testTypeController.getAllTestTypes(req, res, next);
});

/**
 * GET /api/test-types/enabled
 * 활성화된 테스트 타입만 조회
 */
router.get('/enabled', async (req, res, next) => {
  await testTypeController.getEnabledTestTypes(req, res, next);
});

/**
 * POST /api/test-types
 * 테스트 타입 추가
 */
router.post('/', async (req, res, next) => {
  await testTypeController.addTestType(req, res, next);
});

/**
 * PUT /api/test-types/:id
 * 테스트 타입 수정
 */
router.put('/:id', async (req, res, next) => {
  await testTypeController.updateTestType(req, res, next);
});

/**
 * DELETE /api/test-types/:id
 * 테스트 타입 삭제
 */
router.delete('/:id', async (req, res, next) => {
  await testTypeController.deleteTestType(req, res, next);
});

/**
 * PATCH /api/test-types/:id/toggle
 * 테스트 타입 활성화/비활성화 토글
 */
router.patch('/:id/toggle', async (req, res, next) => {
  await testTypeController.toggleTestType(req, res, next);
});

/**
 * POST /api/test-types/initialize
 * 기본 테스트 타입 초기화
 */
router.post('/initialize', async (req, res, next) => {
  await testTypeController.initializeDefaultTestTypes(req, res, next);
});

export { router as testTypeRoutes }; 