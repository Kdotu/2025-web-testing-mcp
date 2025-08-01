import { Router } from 'express';
import { E2ETestController } from '../controllers/e2e-test-controller';

const router = Router();
const e2eTestController = new E2ETestController();

// E2E 테스트 실행
router.post('/', e2eTestController.executeE2ETest);

// E2E 테스트 상태 조회
router.get('/:testId', e2eTestController.getE2ETestStatus);

// E2E 테스트 취소
router.delete('/:testId', e2eTestController.cancelE2ETest);

export default router; 