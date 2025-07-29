"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadTestController = void 0;
const k6_service_1 = require("../services/k6-service");
const test_result_service_1 = require("../services/test-result-service");
const error_handler_1 = require("../middleware/error-handler");
const uuid_1 = require("uuid");
class LoadTestController {
    constructor() {
        this.k6Service = new k6_service_1.K6Service();
        this.testResultService = new test_result_service_1.TestResultService();
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
                http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
                http_req_rate: 0,
                http_req_failed: 0,
                vus: 0,
                vus_max: 0
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
    async executeK6MCPTest(params) {
        const testId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const scriptPath = path.join(tempDir, `${testId}.js`);
        fs.writeFileSync(scriptPath, params.script);
        const initialResult = {
            id: (0, uuid_1.v4)(),
            testId,
            url: params.url,
            config: {
                id: testId,
                url: params.url,
                name: params.name,
                description: params.description,
                stages: [],
                createdAt: now,
                updatedAt: now
            },
            status: 'running',
            metrics: {
                http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
                http_req_rate: 0,
                http_req_failed: 0,
                vus: 0,
                vus_max: 0
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
        this.executeK6MCPTestAsync(testId, scriptPath, params.config).catch(error => {
            console.error('k6 MCP test execution failed:', error);
            this.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
        });
        return initialResult;
    }
    async executeK6MCPTestAsync(testId, _scriptPath, _config) {
        try {
            await this.k6Service.executeTest(testId, {
                id: testId,
                url: '',
                name: 'k6 MCP Test',
                stages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            await this.updateTestStatus(testId, 'completed', 'k6 MCP test completed successfully');
        }
        catch (error) {
            console.error('k6 MCP test execution error:', error);
            await this.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
            throw error;
        }
    }
}
exports.LoadTestController = LoadTestController;
//# sourceMappingURL=load-test-controller.js.map