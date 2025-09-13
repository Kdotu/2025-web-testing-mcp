"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const test_manage_controller_1 = require("../controllers/test-manage-controller");
const error_handler_1 = require("../middleware/error-handler");
const router = (0, express_1.Router)();
const testManageController = new test_manage_controller_1.TestManageController();
router.post('/e2e', testManageController.executeE2ETest);
router.post('/lighthouse', async (req, res) => {
    await testManageController.runLighthouseTest(req, res);
});
router.post('/load', async (req, res, next) => {
    try {
        const config = req.body;
        if (!config.url || !config.name || !config.stages) {
            throw (0, error_handler_1.createValidationError)('URL, name, and stages are required');
        }
        if (!Array.isArray(config.stages) || config.stages.length === 0) {
            throw (0, error_handler_1.createValidationError)('At least one stage is required');
        }
        const result = await testManageController.createLoadTest(config);
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
router.post('/load/k6-mcp-direct', async (req, res, next) => {
    try {
        const { url, name, description, script, config } = req.body;
        if (!url || !name || !script) {
            throw (0, error_handler_1.createValidationError)('URL, name, and script are required');
        }
        const result = await testManageController.executeK6MCPTestDirect({
            url,
            name,
            description,
            script,
            config
        });
        res.status(201).json({
            success: true,
            data: result,
            message: 'k6 MCP test executed successfully (direct mode)',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/load/k6-mcp', async (req, res, next) => {
    try {
        const { url, name, description, script, config } = req.body;
        if (!url || !name || !script) {
            throw (0, error_handler_1.createValidationError)('URL, name, and script are required');
        }
        const result = await testManageController.executeK6MCPTest({
            url,
            name,
            description,
            script,
            config
        });
        res.status(201).json({
            success: true,
            data: result,
            message: 'k6 MCP test executed successfully (MCP server mode)',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/status/:testId', testManageController.getTestStatus);
router.delete('/cancel/:testId', testManageController.cancelTest);
router.put('/status/:testId', testManageController.updateTestStatus);
exports.default = router;
//# sourceMappingURL=test-routes.js.map