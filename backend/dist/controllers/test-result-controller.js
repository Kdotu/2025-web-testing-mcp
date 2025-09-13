"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestResultController = void 0;
const test_result_service_1 = require("../services/test-result-service");
const error_handler_1 = require("../middleware/error-handler");
class TestResultController {
    constructor() {
        this.testResultService = new test_result_service_1.TestResultService();
    }
    async getAllResults(options) {
        const { results, total } = await this.testResultService.getAllResults(options);
        const totalPages = Math.ceil(total / options.limit);
        return {
            results,
            total,
            page: options.page,
            limit: options.limit,
            totalPages
        };
    }
    async getResultById(id) {
        const result = await this.testResultService.getResultById(id);
        if (!result) {
            throw (0, error_handler_1.createNotFoundError)('Test result');
        }
        return result;
    }
    async deleteResult(id) {
        const result = await this.testResultService.getResultById(id);
        if (!result) {
            throw (0, error_handler_1.createNotFoundError)('Test result');
        }
        await this.testResultService.deleteResult(id);
    }
    async getTotalCount() {
        const total = await this.testResultService.getTotalCount();
        return { total };
    }
    async getStatistics() {
        const stats = await this.testResultService.getStatistics();
        return stats;
    }
}
exports.TestResultController = TestResultController;
//# sourceMappingURL=test-result-controller.js.map