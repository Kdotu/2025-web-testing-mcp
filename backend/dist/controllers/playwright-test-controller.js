"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaywrightTestController = void 0;
const playwright_test_service_1 = require("../services/playwright-test-service");
const mcp_service_wrapper_1 = require("../services/mcp-service-wrapper");
class PlaywrightTestController {
    constructor() {
        this.playwrightService = new playwright_test_service_1.PlaywrightTestService();
    }
    async executeTestScenario(req, res) {
        try {
            console.log('[Playwright Controller] Executing test scenario');
            const { scenarioCode, config = {}, userId, description } = req.body;
            if (!scenarioCode || typeof scenarioCode !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'scenarioCode is required and must be a string'
                });
                return;
            }
            if (scenarioCode.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'scenarioCode cannot be empty'
                });
                return;
            }
            const validatedConfig = {
                browser: config.browser || 'chromium',
                headless: config.headless !== false,
                viewport: config.viewport || { width: 1280, height: 720 },
                timeout: config.timeout || 30000,
                userAgent: config.userAgent
            };
            console.log('[Playwright Controller] Starting test execution flow');
            const executionId = await this.playwrightService.executeTestScenarioFlow(scenarioCode, validatedConfig, userId, description);
            console.log('[Playwright Controller] Test execution flow completed successfully');
            res.status(200).json({
                success: true,
                data: {
                    executionId,
                    message: 'Test scenario execution started successfully',
                    status: 'completed'
                }
            });
        }
        catch (error) {
            console.error('[Playwright Controller] Test execution failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async getTestExecutionStatus(req, res) {
        try {
            const { executionId } = req.params;
            if (!executionId) {
                res.status(400).json({
                    success: false,
                    error: 'executionId is required'
                });
                return;
            }
            console.log('[Playwright Controller] Getting test execution status for:', executionId);
            const status = await this.playwrightService.getTestExecutionStatus(executionId);
            console.log('[Playwright Controller] Status response:', JSON.stringify(status, null, 2));
            res.status(200).json({
                success: true,
                data: status
            });
        }
        catch (error) {
            console.error('[Playwright Controller] Failed to get test execution status:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async getTestExecutionResult(req, res) {
        try {
            const { executionId } = req.params;
            if (!executionId) {
                res.status(400).json({
                    success: false,
                    error: 'executionId is required'
                });
                return;
            }
            console.log('[Playwright Controller] Getting test execution result for:', executionId);
            const result = await this.playwrightService.getTestExecutionResult(executionId);
            if (!result) {
                res.status(404).json({
                    success: false,
                    error: 'Test execution result not found or not completed'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            console.error('[Playwright Controller] Failed to get test execution result:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async validateTestScenario(req, res) {
        try {
            const { scenarioCode } = req.body;
            if (!scenarioCode || typeof scenarioCode !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'scenarioCode is required and must be a string'
                });
                return;
            }
            const validationResult = this.validatePlaywrightCode(scenarioCode);
            res.status(200).json({
                success: true,
                data: validationResult
            });
        }
        catch (error) {
            console.error('[Playwright Controller] Scenario validation failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    validatePlaywrightCode(scenarioCode) {
        const errors = [];
        const warnings = [];
        if (scenarioCode.length < 10) {
            errors.push('Scenario code is too short');
        }
        if (scenarioCode.length > 10000) {
            errors.push('Scenario code is too long (max 10,000 characters)');
        }
        const playwrightKeywords = ['page', 'browser', 'context', 'await', 'async'];
        const hasPlaywrightElements = playwrightKeywords.some(keyword => scenarioCode.toLowerCase().includes(keyword));
        if (!hasPlaywrightElements) {
            warnings.push('Code may not contain Playwright-specific elements');
        }
        const dangerousPatterns = [
            'eval(',
            'Function(',
            'setTimeout(',
            'setInterval(',
            'process.',
            'require(',
            'import('
        ];
        dangerousPatterns.forEach(pattern => {
            if (scenarioCode.includes(pattern)) {
                errors.push(`Potentially dangerous code pattern detected: ${pattern}`);
            }
        });
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    async checkMCPStatus(_req, res) {
        try {
            const mcpWrapper = new mcp_service_wrapper_1.MCPServiceWrapper();
            const connections = await mcpWrapper.checkConnections();
            res.json({
                success: true,
                data: {
                    connections,
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('[Playwright Controller] MCP status check failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async cleanup() {
        try {
            await this.playwrightService.cleanup();
            console.log('[Playwright Controller] Cleanup completed successfully');
        }
        catch (error) {
            console.error('[Playwright Controller] Cleanup failed:', error);
        }
    }
}
exports.PlaywrightTestController = PlaywrightTestController;
//# sourceMappingURL=playwright-test-controller.js.map