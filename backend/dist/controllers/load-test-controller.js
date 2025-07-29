"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadTestController = void 0;
const k6_service_1 = require("../services/k6-service");
const m2_m2_test_results_service_1 = require("../services/test-result-service");
const error_handler_1 = require("../middleware/error-handler");
const uuid_1 = require("uuid");
class LoadTestController {
    constructor() {
        this.k6Service = new k6_service_1.K6Service();
        this.testResultService = new m2_m2_test_results_service_1.TestResultService();
    }
    async createTest(config) {
        const testId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const testConfig = {
            ...config,
            id: testId,
            createdAt: now,
            updatedAt: now
        };
        const initialResult = {
            id: (0, uuid_1.v4)(),
            testId,
            url: config.url,
            config: testConfig,
            status: 'pending',
            metrics: {
                avgResponseTime: 0,
                maxResponseTime: 0,
                minResponseTime: 0,
                requestsPerSecond: 0,
                errorRate: 0,
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0
            },
            summary: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                duration: 0,
                startTime: now,
                endTime: now
            },
            createdAt: now,
            updatedAt: now
        };
        await this.testResultService.saveResult(initialResult);
        this.k6Service.executeTest(testId, testConfig).catch(error => {
            console.error('Test execution failed:', error);
            this.updateTestStatus(testId, 'failed', 'Test execution failed');
        });
        return initialResult;
    }
    async getTestStatus(testId) {
        const result = await this.testResultService.getResultByTestId(testId);
        if (!result) {
            throw (0, error_handler_1.createNotFoundError)('Test');
        }
        return {
            testId,
            status: result.status,
            message: `Test ${result.status}`,
            timestamp: new Date().toISOString()
        };
    }
    async getTestResults(testId) {
        const result = await this.testResultService.getResultByTestId(testId);
        if (!result) {
            throw (0, error_handler_1.createNotFoundError)('Test result');
        }
        return result;
    }
    async cancelTest(testId) {
        await this.k6Service.cancelTest(testId);
        await this.updateTestStatus(testId, 'cancelled', 'Test cancelled by user');
    }
    async updateTestStatus(testId, status, _message) {
        const result = await this.testResultService.getResultByTestId(testId);
        if (result) {
            result.status = status;
            result.updatedAt = new Date().toISOString();
            if (status === 'completed' || status === 'failed' || status === 'cancelled') {
                result.summary.endTime = new Date().toISOString();
            }
            await this.testResultService.updateResult(result);
        }
    }
    async updateTestResult(testId, result) {
        const existingResult = await this.testResultService.getResultByTestId(testId);
        if (existingResult) {
            const updatedResult = {
                ...existingResult,
                ...result,
                updatedAt: new Date().toISOString()
            };
            await this.testResultService.updateResult(updatedResult);
        }
    }
}
exports.LoadTestController = LoadTestController;
//# sourceMappingURL=load-test-controller.js.map