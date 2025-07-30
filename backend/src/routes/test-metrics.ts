import express from 'express';
import { TestMetricController } from '../controllers/test-metric-controller';

const router = express.Router();
const testMetricController = new TestMetricController();

// 특정 테스트의 모든 메트릭 조회
router.get('/:testId', testMetricController.getMetricsByTestId);

// 특정 테스트의 메트릭을 타입별로 그룹화하여 조회
router.get('/:testId/grouped', testMetricController.getGroupedMetricsByTestId);

// 특정 테스트의 특정 타입 메트릭 조회
router.get('/:testId/type/:metricType', testMetricController.getMetricsByTestIdAndType);

// 특정 테스트의 특정 타입과 이름의 메트릭 조회
router.get('/:testId/type/:metricType/name/:metricName', testMetricController.getMetricByTestIdTypeAndName);

// 특정 테스트의 특정 타입과 이름의 메트릭 통계 조회
router.get('/:testId/type/:metricType/name/:metricName/stats', testMetricController.getMetricStatsByTestIdTypeAndName);

export default router; 