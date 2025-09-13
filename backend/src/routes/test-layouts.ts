import { Router } from 'express';
import { TestLayoutController } from '../controllers/test-layout-controller';

const router = Router();
const testLayoutController = new TestLayoutController();

// 모든 레이아웃 조회
router.get('/', (req, res) => testLayoutController.getAllLayouts(req, res));

// 테스트 타입별 레이아웃 조회
router.get('/test-type/:testType', (req, res) => testLayoutController.getLayoutsByTestType(req, res));

// 특정 레이아웃 조회
router.get('/:id', (req, res) => testLayoutController.getLayoutById(req, res));

// 새 레이아웃 생성
router.post('/', (req, res) => testLayoutController.createLayout(req, res));

// 레이아웃 업데이트
router.put('/:id', (req, res) => testLayoutController.updateLayout(req, res));

// 레이아웃 삭제
router.delete('/:id', (req, res) => testLayoutController.deleteLayout(req, res));

// 섹션 생성
router.post('/sections', (req, res) => testLayoutController.createSection(req, res));

// 필드 생성
router.post('/fields', (req, res) => testLayoutController.createField(req, res));

export { router as testLayoutRoutes };
