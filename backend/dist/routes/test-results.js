"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testResultRoutes = void 0;
const express_1 = require("express");
const m2_m2_test_results_controller_1 = require("../controllers/test-result-controller");
const router = (0, express_1.Router)();
exports.testResultRoutes = router;
const testResultController = new m2_m2_test_results_controller_1.TestResultController();
router.get('/', async (req, res, next) => {
    try {
        const { page = '1', limit = '10', status } = req.query;
        const result = await testResultController.getAllResults({
            page: parseInt(page),
            limit: parseInt(limit),
            status: status
        });
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