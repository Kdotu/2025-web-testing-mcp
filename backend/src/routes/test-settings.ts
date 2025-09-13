import { Router } from 'express';
import { TestSettingsController } from '../controllers/test-settings-controller';

const router = Router();
const testSettingsController = new TestSettingsController();

// 모든 테스트 설정 조회
router.get('/', (req, res) => testSettingsController.getAllSettings(req, res));

// 특정 설정 조회
router.get('/:id', (req, res) => testSettingsController.getSettingById(req, res));

// 새 설정 생성
router.post('/', (req, res) => testSettingsController.createSetting(req, res));

// 설정 업데이트
router.put('/:id', (req, res) => testSettingsController.updateSetting(req, res));

// 설정 삭제
router.delete('/:id', (req, res) => testSettingsController.deleteSetting(req, res));

// 카테고리별 설정 조회
router.get('/category/:category', (req, res) => testSettingsController.getSettingsByCategory(req, res));

// 설정 검색
router.get('/search', (req, res) => testSettingsController.searchSettings(req, res));

export { router as testSettingsRoutes };
