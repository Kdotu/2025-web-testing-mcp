"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const test_metric_controller_1 = require("../controllers/test-metric-controller");
const router = express_1.default.Router();
const testMetricController = new test_metric_controller_1.TestMetricController();
router.get('/:testId', testMetricController.getMetricsByTestId);
router.get('/:testId/grouped', testMetricController.getGroupedMetricsByTestId);
router.get('/:testId/type/:metricType', testMetricController.getMetricsByTestIdAndType);
router.get('/:testId/type/:metricType/name/:metricName', testMetricController.getMetricByTestIdTypeAndName);
router.get('/:testId/type/:metricType/name/:metricName/stats', testMetricController.getMetricStatsByTestIdTypeAndName);
exports.default = router;
//# sourceMappingURL=test-metrics.js.map