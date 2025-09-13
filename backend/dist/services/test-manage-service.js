"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestManageService = void 0;
const test_result_service_1 = require("./test-result-service");
class TestManageService {
    constructor() {
        this.testResultService = new test_result_service_1.TestResultService();
    }
    async getTestStatus(testId) {
        try {
            const result = await this.testResultService.getResultByTestId(testId);
            if (!result) {
                return {
                    testId,
                    status: 'not_found',
                    currentStep: '테스트를 찾을 수 없습니다',
                    message: `Test ${testId} not found`,
                    timestamp: new Date().toISOString()
                };
            }
            return {
                testId,
                status: result.status,
                currentStep: result.currentStep || '테스트 진행 중...',
                message: `Test ${result.status}`,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('테스트 상태 조회 실패:', error);
            throw error;
        }
    }
    async cancelTest(testId) {
        try {
            const result = await this.testResultService.getResultByTestId(testId);
            if (!result) {
                console.log(`테스트 ${testId}를 찾을 수 없습니다.`);
                return;
            }
            result.status = 'cancelled';
            result.updatedAt = new Date().toISOString();
            if (!result.summary) {
                result.summary = {
                    totalRequests: 0,
                    successfulRequests: 0,
                    failedRequests: 0,
                    duration: 0,
                    startTime: result.createdAt || new Date().toISOString(),
                    endTime: new Date().toISOString()
                };
            }
            else {
                result.summary.endTime = new Date().toISOString();
            }
            await this.testResultService.updateResult(result);
            console.log(`테스트 ${testId}가 취소되었습니다.`);
        }
        catch (error) {
            console.error('테스트 취소 실패:', error);
            throw error;
        }
    }
    async updateTestStatus(testId, status, currentStep, message) {
        try {
            const result = await this.testResultService.getResultByTestId(testId);
            if (!result) {
                console.log(`테스트 ${testId}를 찾을 수 없습니다.`);
                return;
            }
            result.status = status;
            result.updatedAt = new Date().toISOString();
            if (currentStep) {
                result.currentStep = currentStep;
            }
            if (status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'stopped') {
                if (!result.summary) {
                    result.summary = {
                        totalRequests: 0,
                        successfulRequests: 0,
                        failedRequests: 0,
                        duration: 0,
                        startTime: result.createdAt || new Date().toISOString(),
                        endTime: new Date().toISOString()
                    };
                }
                else {
                    result.summary.endTime = new Date().toISOString();
                }
            }
            await this.testResultService.updateResult(result);
            if (message) {
                console.log(`테스트 ${testId} 상태가 ${status}로 업데이트되었습니다: ${message}`);
            }
            else {
                console.log(`테스트 ${testId} 상태가 ${status}로 업데이트되었습니다.`);
            }
        }
        catch (error) {
            console.error('테스트 상태 업데이트 실패:', error);
            throw error;
        }
    }
    async getRunningTests() {
        try {
            return await this.testResultService.getRunningTests();
        }
        catch (error) {
            console.error('실행 중인 테스트 조회 실패:', error);
            throw error;
        }
    }
    async deleteTestResult(testId) {
        try {
            await this.testResultService.deleteResult(testId);
            console.log(`테스트 결과 ${testId}가 삭제되었습니다.`);
        }
        catch (error) {
            console.error('테스트 결과 삭제 실패:', error);
            throw error;
        }
    }
}
exports.TestManageService = TestManageService;
//# sourceMappingURL=test-manage-service.js.map