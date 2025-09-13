"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const playwright_test_controller_1 = require("../controllers/playwright-test-controller");
const router = (0, express_1.Router)();
const playwrightController = new playwright_test_controller_1.PlaywrightTestController();
router.post('/execute', async (req, res) => {
    await playwrightController.executeTestScenario(req, res);
});
router.get('/status/:executionId', async (req, res) => {
    await playwrightController.getTestExecutionStatus(req, res);
});
router.get('/results/:executionId', async (req, res) => {
    await playwrightController.getTestExecutionResult(req, res);
});
router.post('/validate', async (req, res) => {
    await playwrightController.validateTestScenario(req, res);
});
router.get('/mcp/status', async (req, res) => {
    await playwrightController.checkMCPStatus(req, res);
});
exports.default = router;
//# sourceMappingURL=playwright-test.js.map