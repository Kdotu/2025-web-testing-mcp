"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTestRoutes = void 0;
const express_1 = require("express");
const load_test_controller_1 = require("../controllers/load-test-controller");
const error_handler_1 = require("../middleware/error-handler");
const router = (0, express_1.Router)();
exports.loadTestRoutes = router;
const loadTestController = new load_test_controller_1.LoadTestController();
router.post('/', async (req, res, next) => {
    try {
        const config = req.body;
        if (!config.url || !config.name || !config.stages) {
            throw (0, error_handler_1.createValidationError)('URL, name, and stages are required');
        }
        if (!Array.isArray(config.stages) || config.stages.length === 0) {
            throw (0, error_handler_1.createValidationError)('At least one stage is required');
        }
        const result = await loadTestController.createTest(config);
        res.status(201).json({
            success: true,
            data: result,
            message: 'Load test created successfully',
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
            throw (0, error_handler_1.createValidationError)('Test ID is required');
        }
        const result = await loadTestController.getTestStatus(id);
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
router.get('/:id/results', async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw (0, error_handler_1.createValidationError)('Test ID is required');
        }
        const result = await loadTestController.getTestResults(id);
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
            throw (0, error_handler_1.createValidationError)('Test ID is required');
        }
        await loadTestController.cancelTest(id);
        res.json({
            success: true,
            message: 'Test cancelled successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/k6-mcp', async (req, res, next) => {
    try {
        const { url, name, description, script, config } = req.body;
        if (!url || !name || !script) {
            throw (0, error_handler_1.createValidationError)('URL, name, and script are required');
        }
        const result = await loadTestController.executeK6MCPTest({
            url,
            name,
            description,
            script,
            config
        });
        res.status(201).json({
            success: true,
            data: result,
            message: 'k6 MCP test executed successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=load-tests.js.map