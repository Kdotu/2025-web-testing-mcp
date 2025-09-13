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
exports.TestManageController = void 0;
const uuid_1 = require("uuid");
const e2e_test_service_1 = require("../services/e2e-test-service");
const lighthouse_service_1 = require("../services/lighthouse-service");
const k6_service_1 = require("../services/k6-service");
const test_result_service_1 = require("../services/test-result-service");
const test_manage_service_1 = require("../services/test-manage-service");
const error_handler_1 = require("../middleware/error-handler");
class TestManageController {
    constructor() {
        this.executeE2ETest = async (req, res, next) => {
            try {
                const { url, name, description, config } = req.body;
                if (!url || !name) {
                    throw (0, error_handler_1.createValidationError)('URL과 이름은 필수입니다.');
                }
                console.log('🚀 E2E 테스트 시작:', { url, name, description, config });
                const structuredConfig = {
                    testType: config?.testType || 'e2e',
                    settings: config?.settings || {},
                    url,
                    name: name || 'E2E 테스트',
                    description: description || '',
                    timestamp: new Date().toISOString()
                };
                console.log('📋 구조화된 config:', JSON.stringify(structuredConfig, null, 2));
                const testResult = await this.testResultService.createInitialResult({
                    testType: config?.testType || 'e2e',
                    url,
                    name: name || 'E2E 테스트',
                    description,
                    status: 'pending',
                    config: structuredConfig
                });
                console.log('✅ 초기 테스트 결과 생성 완료:', testResult.test_id);
                this.e2eTestService.executeE2ETest({
                    url,
                    name,
                    description,
                    config
                }, testResult.test_id).catch(async (error) => {
                    console.error('E2E 테스트 실행 중 오류 발생:', error);
                    try {
                        await this.testResultService.updateResult({
                            id: testResult.id,
                            testId: testResult.test_id,
                            testType: config?.testType || 'e2e',
                            url,
                            name,
                            description,
                            status: 'failed',
                            currentStep: '테스트 실행 실패',
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
                                startTime: new Date().toISOString(),
                                endTime: new Date().toISOString()
                            },
                            details: {},
                            config,
                            raw_data: `Error: ${error.message}`,
                            createdAt: testResult.created_at,
                            updatedAt: new Date().toISOString()
                        });
                    }
                    catch (updateError) {
                        console.error('Failed to update test status to failed:', updateError);
                    }
                });
                await this.testResultService.updateResult({
                    id: testResult.id,
                    testId: testResult.test_id,
                    testType: config?.testType || 'e2e',
                    url,
                    name,
                    description,
                    status: 'running',
                    currentStep: '테스트 시작',
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
                        startTime: new Date().toISOString(),
                        endTime: new Date().toISOString()
                    },
                    details: {},
                    config,
                    raw_data: '',
                    createdAt: testResult.created_at,
                    updatedAt: new Date().toISOString()
                });
                console.log('✅ E2E 테스트 상태 업데이트 완료');
                res.status(201).json({
                    success: true,
                    data: {
                        testId: testResult.test_id,
                        status: 'running',
                        currentStep: '테스트 시작',
                        message: 'E2E 테스트가 시작되었습니다.'
                    },
                    message: 'E2E 테스트가 시작되었습니다.',
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('❌ E2E 테스트 실행 실패:', error);
                next(error);
            }
        };
        console.log('🔧 TestManageController 생성자 시작...');
        try {
            this.testResultService = new test_result_service_1.TestResultService();
            console.log('✅ TestResultService 초기화 완료');
            this.e2eTestService = new e2e_test_service_1.E2ETestService(this.testResultService);
            console.log('✅ E2ETestService 초기화 완료');
            this.lighthouseService = new lighthouse_service_1.LighthouseService();
            console.log('✅ LighthouseService 초기화 완료');
            this.k6Service = new k6_service_1.K6Service();
            console.log('✅ K6Service 초기화 완료');
            this.testManageService = new test_manage_service_1.TestManageService();
            console.log('✅ TestManageService 초기화 완료');
            console.log('🎉 TestManageController 생성자 완료');
        }
        catch (error) {
            console.error('❌ TestManageController 생성자 에러:', error);
            throw error;
        }
    }
    async runLighthouseTest(req, res) {
        try {
            const { url, device = 'desktop', categories = ['performance', 'accessibility', 'best-practices', 'seo'], name, description } = req.body;
            if (!url) {
                res.status(400).json({
                    success: false,
                    error: 'URL is required'
                });
                return;
            }
            console.log('🚀 Lighthouse 테스트 시작:', { url, device, categories, name, description });
            const runningTests = await this.testResultService.getRunningTests();
            const existingLighthouseTest = runningTests.find(test => test.testType === 'lighthouse' && test.url === url);
            if (existingLighthouseTest) {
                console.log(`⚠️ Lighthouse test for ${url} is already running (ID: ${existingLighthouseTest.testId})`);
                res.status(409).json({
                    success: false,
                    error: 'Lighthouse test is already running for this URL',
                    data: {
                        existingTestId: existingLighthouseTest.testId,
                        status: existingLighthouseTest.status,
                        currentStep: existingLighthouseTest.currentStep
                    }
                });
                return;
            }
            const structuredConfig = {
                testType: 'lighthouse',
                device: device || 'desktop',
                categories: categories || ['performance', 'accessibility', 'best-practices', 'seo'],
                url,
                name: name || 'Lighthouse 테스트',
                description: description || '',
                timestamp: new Date().toISOString(),
                settings: {
                    device: device || 'desktop',
                    categories: categories || ['performance', 'accessibility', 'best-practices', 'seo']
                }
            };
            console.log('📋 구조화된 Lighthouse config:', JSON.stringify(structuredConfig, null, 2));
            const testResult = await this.testResultService.createInitialResult({
                testType: 'lighthouse',
                url,
                name: name || 'Lighthouse 테스트',
                description: description || '',
                status: 'running',
                config: structuredConfig
            });
            console.log('✅ 초기 Lighthouse 테스트 결과 생성 완료:', testResult.test_id);
            const id = (0, uuid_1.v4)();
            const testId = testResult.test_id;
            const config = {
                url,
                device,
                categories,
                testType: 'lighthouse'
            };
            console.log(`Starting Lighthouse test via MCP for URL: ${url}`);
            console.log(`ID: ${id}`);
            console.log(`Test ID: ${testId}`);
            this.lighthouseService.executeTest(id, testId, config).catch(async (error) => {
                console.error('Lighthouse MCP test execution error:', error);
                try {
                    await this.testResultService.updateResult({
                        id: testResult.id,
                        testId: testResult.test_id,
                        testType: 'lighthouse',
                        url,
                        name: name || 'Lighthouse 테스트',
                        description: description || '',
                        status: 'failed',
                        currentStep: '테스트 실행 실패',
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
                            startTime: new Date().toISOString(),
                            endTime: new Date().toISOString()
                        },
                        details: {},
                        config: { device, categories, testType: 'lighthouse' },
                        raw_data: `Error: ${error.message}`,
                        createdAt: testResult.created_at,
                        updatedAt: new Date().toISOString()
                    });
                }
                catch (updateError) {
                    console.error('Failed to update test status to failed:', updateError);
                }
            });
            res.status(200).json({
                success: true,
                data: {
                    testId: testResult.test_id,
                    status: 'running',
                    currentStep: 'Lighthouse 실행 중',
                    message: 'Lighthouse test started successfully'
                },
                message: 'Lighthouse test started successfully',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('❌ Lighthouse 테스트 실행 실패:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start Lighthouse test'
            });
        }
    }
    async createLoadTest(config) {
        try {
            console.log('🚀 Load 테스트 시작:', config);
            const structuredConfig = {
                testType: 'load',
                name: config.name || '부하 테스트',
                description: config.description || '',
                duration: config.duration || '3m',
                vus: config.vus || 10,
                timestamp: new Date().toISOString(),
                settings: {
                    duration: config.duration || '3m',
                    vus: config.vus || 10,
                    detailedConfig: config.detailedConfig || {}
                },
                ...config
            };
            console.log('📋 구조화된 Load config:', JSON.stringify(structuredConfig, null, 2));
            const testResult = await this.testResultService.createInitialResult({
                testType: 'load',
                url: config.url,
                name: config.name || '부하 테스트',
                description: config.description || '',
                status: 'pending',
                config: structuredConfig
            });
            console.log('✅ 초기 Load 테스트 결과 생성 완료:', testResult.test_id);
            const testId = testResult.test_id;
            const now = new Date().toISOString();
            const testConfig = {
                ...config,
                id: testId,
                createdAt: now,
                updatedAt: now
            };
            await this.testResultService.updateResult({
                id: testResult.id,
                testId: testResult.test_id,
                testType: 'load',
                url: config.url,
                name: config.name || '부하 테스트',
                description: config.description || '',
                status: 'running',
                currentStep: 'k6 테스트 실행 중',
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
                details: {},
                config: testConfig,
                raw_data: '',
                createdAt: testResult.created_at,
                updatedAt: now
            });
            this.k6Service.executeTest(testId, testConfig).catch(async (error) => {
                console.error('Test execution failed:', error);
                try {
                    await this.testResultService.updateResult({
                        id: testResult.id,
                        testId: testResult.test_id,
                        testType: 'load',
                        url: config.url,
                        name: config.name || '부하 테스트',
                        description: config.description || '',
                        status: 'failed',
                        currentStep: '테스트 실행 실패',
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
                        details: {},
                        config: testConfig,
                        raw_data: `Error: ${error.message}`,
                        createdAt: testResult.created_at,
                        updatedAt: new Date().toISOString()
                    });
                }
                catch (updateError) {
                    console.error('Failed to update test status to failed:', updateError);
                }
            });
            console.log('✅ Load 테스트 상태 업데이트 완료');
            return {
                id: testResult.id,
                testId: testResult.test_id,
                testType: 'load',
                url: config.url,
                name: config.name || '부하 테스트',
                description: config.description || '',
                status: 'running',
                currentStep: 'k6 테스트 실행 중',
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
                details: {},
                config: testConfig,
                raw_data: '',
                createdAt: testResult.created_at,
                updatedAt: now
            };
        }
        catch (error) {
            console.error('❌ Load 테스트 생성 실패:', error);
            throw error;
        }
    }
    async executeK6MCPTestDirect(params) {
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
            testType: 'load',
            url: params.url,
            name: params.name,
            ...(params.description && { description: params.description }),
            config: {
                duration: params.config.duration,
                vus: params.config.vus,
                detailedConfig: params.config.detailedConfig || {}
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
        this.executeK6MCPTestDirectAsync(testId, scriptPath, params.config, params.url).catch(error => {
            console.error('k6 MCP test execution failed:', error);
            this.testManageService.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
        });
        return initialResult;
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
            testType: 'load',
            url: params.url,
            name: params.name,
            ...(params.description && { description: params.description }),
            config: {
                duration: params.config.duration,
                vus: params.config.vus,
                detailedConfig: params.config.detailedConfig || {}
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
        this.executeK6MCPTestAsync(testId, scriptPath, params.config, params.url).catch(error => {
            console.error('k6 MCP test execution failed:', error);
            this.testManageService.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
        });
        return initialResult;
    }
    async getTestStatus(req, res, next) {
        try {
            const { testId } = req.params;
            if (!testId) {
                throw (0, error_handler_1.createValidationError)('테스트 ID가 필요합니다.');
            }
            const result = await this.testManageService.getTestStatus(testId);
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelTest(req, res, next) {
        try {
            const { testId } = req.params;
            if (!testId) {
                throw (0, error_handler_1.createValidationError)('테스트 ID가 필요합니다.');
            }
            await this.testManageService.cancelTest(testId);
            res.json({
                success: true,
                message: '테스트 취소 요청이 처리되었습니다.',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateTestStatus(req, res, next) {
        try {
            const { testId } = req.params;
            const { status, currentStep, message } = req.body;
            if (!testId || !status) {
                throw (0, error_handler_1.createValidationError)('테스트 ID와 상태는 필수입니다.');
            }
            await this.testManageService.updateTestStatus(testId, status, currentStep, message);
            res.json({
                success: true,
                message: '테스트 상태가 업데이트되었습니다.',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            next(error);
        }
    }
    async executeK6MCPTestAsync(testId, _scriptPath, config, url) {
        try {
            await this.k6Service.executeTestViaMCP(testId, {
                id: testId,
                url: url,
                targetUrl: url,
                name: 'k6 MCP Test',
                duration: config.duration,
                vus: config.vus,
                detailedConfig: config.detailedConfig,
                stages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            console.log('k6 MCP server test completed successfully, updating status to completed');
        }
        catch (error) {
            console.error('k6 MCP server test execution error:', error);
            await this.testManageService.updateTestStatus(testId, 'failed', 'k6 MCP server test execution failed');
            throw error;
        }
    }
    async executeK6MCPTestDirectAsync(testId, _scriptPath, config, url) {
        try {
            await this.k6Service.executeTest(testId, {
                id: testId,
                url: url,
                targetUrl: url,
                name: 'k6 MCP Test',
                duration: config.duration,
                vus: config.vus,
                detailedConfig: config.detailedConfig,
                stages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            console.log('k6 test completed successfully, updating status to completed');
        }
        catch (error) {
            console.error('k6 MCP test execution error:', error);
            await this.testManageService.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
            throw error;
        }
    }
}
exports.TestManageController = TestManageController;
//# sourceMappingURL=test-manage-controller.js.map