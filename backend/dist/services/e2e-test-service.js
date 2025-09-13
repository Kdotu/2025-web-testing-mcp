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
exports.E2ETestService = void 0;
const uuid_1 = require("uuid");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class E2ETestService {
    constructor(testResultService) {
        this.testResultService = testResultService;
        this.runningTests = new Map();
        this.tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }
    async executeE2ETest(config, dbTestId) {
        const testId = dbTestId || (0, uuid_1.v4)();
        const testResult = {
            id: testId,
            url: config.url,
            name: config.name,
            status: 'running',
            startTime: new Date().toISOString(),
            logs: [],
            ...(config.description && { description: config.description })
        };
        this.runningTests.set(testId, testResult);
        try {
            this.runPlaywrightViaMCP(testId, config);
            return testResult;
        }
        catch (error) {
            throw error;
        }
    }
    async runPlaywrightViaMCP(testId, config) {
        const testResult = this.runningTests.get(testId);
        if (!testResult)
            return;
        try {
            testResult.logs.push('Playwright MCP 서버를 통해 테스트를 시작합니다...');
            const result = await this.executePlaywrightViaMCP(config);
            console.log('Playwright MCP result:', result);
            await this.parsePlaywrightOutput(testId, result, config);
            await this.handleTestCompletion(testId, 'completed');
        }
        catch (error) {
            console.error('Failed to execute Playwright test via MCP:', error);
            await this.handleTestCompletion(testId, 'failed');
            throw error;
        }
    }
    async executePlaywrightViaMCP(config) {
        return new Promise((resolve, reject) => {
            console.log(`[MCP] Starting Playwright test via MCP server`);
            console.log(`[MCP] Config: url=${config.url}, settings=${JSON.stringify(config.config.settings)}`);
            const playwrightServerPath = path.join(process.cwd(), 'mcp', 'playwright-mcp-server');
            const isWindows = process.platform === 'win32';
            const nodePath = isWindows ? 'node' : 'node';
            console.log(`[MCP] Node path: ${nodePath}`);
            console.log(`[MCP] Working directory: ${playwrightServerPath}`);
            const nodeProcess = (0, child_process_1.spawn)(nodePath, ['playwright_server.js'], {
                cwd: playwrightServerPath,
                env: {
                    ...process.env,
                    PLAYWRIGHT_BROWSER: config.config.settings?.browser || 'chromium'
                }
            });
            console.log(`[MCP] Node process started with PID: ${nodeProcess.pid}`);
            let output = '';
            let errorOutput = '';
            nodeProcess.stdout.on('data', (data) => {
                const dataStr = data.toString();
                output += dataStr;
                console.log(`[MCP] stdout: ${dataStr.trim()}`);
            });
            nodeProcess.stderr.on('data', (data) => {
                const dataStr = data.toString();
                errorOutput += dataStr;
                console.error(`[MCP] stderr: ${dataStr.trim()}`);
            });
            nodeProcess.on('close', (code) => {
                console.log(`[MCP] Process exited with code: ${code}`);
                console.log(`[MCP] Total stdout length: ${output.length}`);
                console.log(`[MCP] Total stderr length: ${errorOutput.length}`);
                try {
                    const response = JSON.parse(output);
                    console.log(`[MCP] Parsed response:`, response);
                    if (response.error) {
                        console.error(`[MCP] Server returned error: ${response.error}`);
                        reject(new Error(`MCP server error: ${response.error}`));
                    }
                    else if (response.result) {
                        console.log(`[MCP] Successfully received result`);
                        resolve(response.result);
                    }
                    else {
                        console.error(`[MCP] Invalid response format`);
                        reject(new Error('MCP server returned invalid response format'));
                    }
                }
                catch (parseError) {
                    console.error('[MCP] Failed to parse response:', parseError);
                    console.error('[MCP] Raw output:', output);
                    reject(new Error(`Failed to parse MCP server response: ${output}`));
                }
            });
            nodeProcess.on('error', (error) => {
                console.error('[MCP] Process error:', error);
                reject(error);
            });
            const testRequest = {
                method: 'run_test',
                params: {
                    url: config.url,
                    config: config.config.settings || {}
                }
            };
            console.log(`[MCP] Sending request:`, JSON.stringify(testRequest));
            nodeProcess.stdin.write(JSON.stringify(testRequest) + '\n');
            nodeProcess.stdin.end();
        });
    }
    async parsePlaywrightOutput(testId, result, config) {
        try {
            console.log('Parsing Playwright output...');
            const testResult = this.runningTests.get(testId);
            if (!testResult)
                return;
            if (result.logs && Array.isArray(result.logs)) {
                testResult.logs.push(...result.logs);
            }
            if (result.success === true) {
                testResult.status = 'completed';
                testResult.endTime = new Date().toISOString();
                testResult.logs.push('E2E 테스트가 성공적으로 완료되었습니다.');
            }
            else {
                testResult.status = 'failed';
                testResult.endTime = new Date().toISOString();
                testResult.error = result.error || 'E2E 테스트가 실패했습니다.';
                testResult.logs.push(`E2E 테스트가 실패했습니다: ${testResult.error}`);
            }
            const performanceMetrics = result.data?.performanceMetrics || result.performanceMetrics || {};
            const rawData = {
                logs: testResult.logs,
                config: config,
                playwrightResult: result,
                performanceMetrics: performanceMetrics,
                browser: result.data?.browser || result.browser || 'chromium',
                url: result.data?.url || result.url || config.url,
                timestamp: result.data?.timestamp || result.timestamp || new Date().toISOString()
            };
            await this.updateTestResult(testId, testResult.status, testResult.logs, config, rawData, performanceMetrics);
            console.log(`[E2E Test ${testId}] 테스트 완료 - DB 업데이트 완료`);
        }
        catch (error) {
            console.error('Failed to parse Playwright output:', error);
            throw error;
        }
    }
    async handleTestCompletion(testId, status) {
        const result = this.runningTests.get(testId);
        if (result) {
            result.status = status;
            result.endTime = new Date().toISOString();
            this.runningTests.set(testId, result);
            if (status === 'completed' || status === 'failed' || status === 'cancelled') {
                console.log(`E2E test ${testId} completed with status: ${status}`);
            }
        }
        this.cleanupTempFiles(testId);
    }
    async updateTestResult(testId, status, logs, config, rawData, metrics) {
        const result = this.runningTests.get(testId);
        if (!result)
            return;
        const existingResult = await this.testResultService.getResultByTestId(testId);
        if (!existingResult)
            return;
        const rawDataToSave = rawData || { logs, config };
        const playwrightMetrics = {
            loadTime: metrics?.loadTime || 0,
            domContentLoaded: metrics?.domContentLoaded || 0,
            firstPaint: metrics?.firstPaint || 0,
            firstContentfulPaint: metrics?.firstContentfulPaint || 0
        };
        const updatedResult = {
            ...existingResult,
            status,
            metrics: {
                ...existingResult.metrics,
                ...playwrightMetrics
            },
            summary: {
                ...existingResult.summary,
                endTime: new Date().toISOString()
            },
            raw_data: JSON.stringify(rawDataToSave),
            updatedAt: new Date().toISOString()
        };
        await this.testResultService.updateResult(updatedResult);
    }
    async cleanupTempFiles(testId) {
        try {
            const scriptPath = path.join(this.tempDir, `${testId}.js`);
            if (fs.existsSync(scriptPath)) {
                fs.unlinkSync(scriptPath);
            }
        }
        catch (error) {
            console.error(`Failed to cleanup temp files for test ${testId}:`, error);
        }
    }
    getRunningTest(testId) {
        return this.runningTests.get(testId);
    }
    getAllRunningTests() {
        return Array.from(this.runningTests.values());
    }
    async getE2ETestStatus(testId) {
        return this.runningTests.get(testId) || null;
    }
    async cancelE2ETest(testId) {
        const testResult = this.runningTests.get(testId);
        if (testResult && testResult.status === 'running') {
            testResult.status = 'cancelled';
            testResult.endTime = new Date().toISOString();
            testResult.logs.push('사용자에 의해 테스트가 취소되었습니다.');
            const rawData = {
                logs: testResult.logs,
                config: {
                    url: testResult.url,
                    name: testResult.name,
                    ...(testResult.description && { description: testResult.description }),
                    config: { testType: 'e2e', settings: {} }
                },
                cancelled: true,
                cancelledAt: new Date().toISOString()
            };
            await this.updateTestResult(testId, 'cancelled', testResult.logs, {
                url: testResult.url,
                name: testResult.name,
                ...(testResult.description && { description: testResult.description }),
                config: { testType: 'e2e', settings: {} }
            }, rawData);
        }
    }
}
exports.E2ETestService = E2ETestService;
//# sourceMappingURL=e2e-test-service.js.map