import { Router } from 'express';
import { DynamicSettingsController } from '../controllers/dynamic-settings-controller';

const router = Router();
const dynamicSettingsController = new DynamicSettingsController();

// 레이아웃 기반 설정 폼 생성
router.get('/form/:testType', dynamicSettingsController.generateSettingsForm);

// 필드 유효성 검사
router.post('/validate/field/:fieldId', dynamicSettingsController.validateField);

// 설정값 저장
router.post('/save/:testType', dynamicSettingsController.saveSettings);

// 설정값 로드
router.get('/load/:testType', dynamicSettingsController.loadSettings);

// 설정값 검증 (전체 폼)
router.post('/validate/:testType', dynamicSettingsController.validateSettings);

// 테스트 실행을 위한 설정값 변환
router.post('/convert/:testType', dynamicSettingsController.convertToTestConfig);

export { router as dynamicSettingsRoutes };
