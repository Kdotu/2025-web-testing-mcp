"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestMetricController = void 0;
const test_metric_service_1 = require("../services/test-metric-service");
class TestMetricController {
    constructor() {
        this.getMetricsByTestId = async (req, res, _next) => {
            try {
                const { testId } = req.params;
                if (!testId) {
                    res.status(400).json({ success: false, error: 'Test ID is required' });
                    return;
                }
                const metrics = await this.testMetricService.getMetricsByTestId(testId);
                res.json({ success: true, data: metrics });
            }
            catch (error) {
                console.error('Failed to get metrics by test ID:', error);
                res.status(500).json({ success: false, error: 'Failed to get metrics' });
            }
        };
        this.getGroupedMetricsByTestId = async (req, res, _next) => {
            try {
                const { testId } = req.params;
                if (!testId) {
                    res.status(400).json({ success: false, error: 'Test ID is required' });
                    return;
                }
                const groupedMetrics = await this.testMetricService.getMetricsGroupedByType(testId);
                res.json({ success: true, data: groupedMetrics });
            }
            catch (error) {
                console.error('Failed to get grouped metrics:', error);
                res.status(500).json({ success: false, error: 'Failed to get grouped metrics' });
            }
        };
        this.getMetricsByTestIdAndType = async (req, res, _next) => {
            try {
                const { testId, metricType } = req.params;
                if (!testId || !metricType) {
                    res.status(400).json({ success: false, error: 'Test ID and metric type are required' });
                    return;
                }
                const metrics = await this.testMetricService.getMetricsByType(testId, metricType);
                res.json({ success: true, data: metrics });
            }
            catch (error) {
                console.error('Failed to get metrics by type:', error);
                res.status(500).json({ success: false, error: 'Failed to get metrics by type' });
            }
        };
        this.getMetricByTestIdTypeAndName = async (req, res, _next) => {
            try {
                const { testId, metricType, metricName } = req.params;
                if (!testId || !metricType || !metricName) {
                    res.status(400).json({ success: false, error: 'Test ID, metric type, and metric name are required' });
                    return;
                }
                const metric = await this.testMetricService.getMetric(testId, metricType, metricName);
                if (!metric) {
                    res.status(404).json({ success: false, error: 'Metric not found' });
                    return;
                }
                res.json({ success: true, data: metric });
            }
            catch (error) {
                console.error('Failed to get metric:', error);
                res.status(500).json({ success: false, error: 'Failed to get metric' });
            }
        };
        this.getMetricStatsByTestIdTypeAndName = async (req, res, _next) => {
            try {
                const { testId, metricType, metricName } = req.params;
                if (!testId || !metricType || !metricName) {
                    res.status(400).json({ success: false, error: 'Test ID, metric type, and metric name are required' });
                    return;
                }
                const stats = await this.testMetricService.getMetricStats(testId, metricType, metricName);
                res.json({ success: true, data: stats });
            }
            catch (error) {
                console.error('Failed to get metric stats:', error);
                res.status(500).json({ success: false, error: 'Failed to get metric stats' });
            }
        };
        this.testMetricService = new test_metric_service_1.TestMetricService();
    }
}
exports.TestMetricController = TestMetricController;
//# sourceMappingURL=test-metric-controller.js.map