"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testResultRoutes = void 0;
const express_1 = require("express");
const test_result_controller_1 = require("../controllers/test-result-controller");
const router = (0, express_1.Router)();
exports.testResultRoutes = router;
const testResultController = new test_result_controller_1.TestResultController();
router.get('/', async (req, res, next) => {
    try {
        const { page = '1', limit = '100', status } = req.query;
        const result = await testResultController.getAllResults({
            page: parseInt(page),
            limit: parseInt(limit),
            status: status
        });
        res.json({
            success: true,
            data: result.results,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/count', async (_req, res, next) => {
    try {
        const result = await testResultController.getTotalCount();
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new Error('Result ID is required');
        }
        const result = await testResultController.getResultById(id);
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new Error('Result ID is required');
        }
        await testResultController.deleteResult(id);
        res.json({
            success: true,
            message: 'Test result deleted successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=test-results.js.map