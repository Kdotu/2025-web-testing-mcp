"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaywrightTestService = void 0;
const mcp_service_wrapper_1 = require("./mcp-service-wrapper");
const supabase_client_1 = require("./supabase-client");
class PlaywrightTestService {
    constructor() {
        this.mcpWrapper = new mcp_service_wrapper_1.MCPServiceWrapper();
        this.supabase = (0, supabase_client_1.createServiceClient)();
    }
    async createTestExecution(scenarioCode, config, userId, descriptionFromClient) {
        try {
            console.log('[Playwright Service] Phase 1: Creating test execution record');
            const testTypeId = await this.getPlaywrightTestTypeId();
            const insertPayload = {
                scenario_code: scenarioCode,
                status: 'pending',
                browser_type: config.browser || 'chromium',
                viewport_width: config.viewport?.width || 1280,
                viewport_height: config.viewport?.height || 720,
                user_id: userId
            };
            if (testTypeId !== null && testTypeId !== undefined) {
                insertPayload.test_type_id = testTypeId;
            }
            console.log('[Playwright Service] Insert payload:', JSON.stringify(insertPayload, null, 2));
            console.log('[Playwright Service] Test type ID:', testTypeId);
            const testId = `playwright-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const description = (descriptionFromClient && descriptionFromClient.trim().length > 0)
                ? descriptionFromClient.trim()
                : this.generateTestDescription(scenarioCode);
            const { data, error } = await this.supabase
                .from('m2_test_results')
                .insert({
                test_id: testId,
                name: 'Playwright E2E Test',
                description: description,
                url: 'http://localhost:3100',
                status: insertPayload.status,
                test_type: 'playwright',
                current_step: '테스트 준비 중...',
                scenario_code: insertPayload.scenario_code,
                browser_type: insertPayload.browser_type,
                viewport_width: insertPayload.viewport_width,
                viewport_height: insertPayload.viewport_height,
                user_id: insertPayload.user_id,
                test_type_id: insertPayload.test_type_id
            })
                .select('id')
                .single();
            if (error) {
                console.error('[Playwright Service] Failed to create test execution record:', error);
                throw new Error(`Failed to create test execution record: ${error.message}`);
            }
            console.log('[Playwright Service] Phase 1: Test execution record created with ID:', data.id);
            return data.id;
        }
        catch (error) {
            console.error('[Playwright Service] Phase 1 failed:', error);
            throw error;
        }
    }
    async executeTestScenario(executionId, scenarioCode, config) {
        try {
            console.log('[Playwright Service] Phase 2: Starting test execution via MCP');
            await this.updateTestStatus(executionId, 'running', 'Starting test execution');
            const mcpResult = await this.mcpWrapper.executePlaywrightScenario(scenarioCode, config);
            console.log('[Playwright Service] Phase 2: MCP result received');
            const result = {
                executionId,
                success: mcpResult.success && mcpResult.data?.success !== false,
                logs: mcpResult.logs || [],
                executionTime: new Date().toISOString(),
                data: mcpResult.data,
                ...(mcpResult.output && { output: mcpResult.output }),
                ...(mcpResult.error && { error: mcpResult.error })
            };
            if (!result.success) {
                console.log('[Playwright Service] Phase 2: Test failed but result will be saved to DB');
                await this.updateTestStatus(executionId, 'failed', 'Test execution failed');
            }
            else {
                console.log('[Playwright Service] Phase 2: Test execution completed successfully');
            }
            return result;
        }
        catch (error) {
            console.error('[Playwright Service] Phase 2 failed:', error);
            await this.updateTestStatus(executionId, 'failed', 'Test execution failed');
            throw error;
        }
    }
    async monitorTestExecution(executionId) {
        try {
            console.log('[Playwright Service] Phase 3: Starting test execution monitoring');
            const progressSteps = [
                { progress: 20, step: 'Browser launching' },
                { progress: 40, step: 'Page loading' },
                { progress: 60, step: 'Scenario execution' },
                { progress: 80, step: 'Result collection' },
                { progress: 100, step: 'Test completed' }
            ];
            for (const step of progressSteps) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.updateTestStatus(executionId, 'running', step.step);
            }
            console.log('[Playwright Service] Phase 3: Test execution monitoring completed');
        }
        catch (error) {
            console.error('[Playwright Service] Phase 3 failed:', error);
            throw error;
        }
    }
    async completeTestExecution(executionId, result) {
        try {
            console.log('[Playwright Service] Phase 4: Completing test execution');
            const finalStatus = result.success ? 'completed' : 'failed';
            console.log(`[Playwright Service] Marking status completed for ${executionId} with status: ${finalStatus}`);
            const rawData = JSON.stringify({
                success: result.success,
                logs: result.logs || [],
                output: result.output,
                error: result.error,
                executionTime: result.executionTime,
                screenshots: result.screenshots || [],
                videos: result.videos || [],
                mcpResult: result.data || null,
                mcpLogs: result.data?.logs || []
            }, null, 2);
            const { error } = await this.supabase
                .from('m2_test_results')
                .update({
                status: finalStatus,
                result_summary: result.output || result.logs?.join('\n'),
                error_details: result.error,
                raw_data: rawData,
                updated_at: new Date().toISOString()
            })
                .eq('id', executionId);
            if (error) {
                console.error('[Playwright Service] Failed to complete test execution:', error);
                throw new Error(`Failed to complete test execution: ${error.message}`);
            }
            console.log('[Playwright Service] Phase 4: Test execution completed successfully');
        }
        catch (error) {
            console.error('[Playwright Service] Phase 4 failed:', error);
            throw error;
        }
    }
    async executeTestScenarioFlow(scenarioCode, config, userId, descriptionFromClient) {
        try {
            console.log('[Playwright Service] Starting complete test execution flow');
            const executionId = await this.createTestExecution(scenarioCode, config, userId, descriptionFromClient);
            const result = await this.executeTestScenario(executionId, scenarioCode, config);
            await this.monitorTestExecution(executionId);
            await this.completeTestExecution(executionId, result);
            console.log('[Playwright Service] Complete test execution flow finished successfully');
            return executionId;
        }
        catch (error) {
            console.error('[Playwright Service] Test execution flow failed:', error);
            throw error;
        }
    }
    async getTestExecutionStatus(executionId) {
        try {
            console.log('[Playwright Service] Getting test execution status for:', executionId);
            const { data, error } = await this.supabase
                .from('m2_test_results')
                .select('id, status, progress_percentage, current_step, created_at, updated_at')
                .eq('id', executionId)
                .eq('test_type', 'playwright')
                .single();
            if (error) {
                console.error('[Playwright Service] Database query failed:', error);
                throw new Error(`Failed to get test execution status: ${error.message}`);
            }
            if (!data) {
                throw new Error(`Test execution not found: ${executionId}`);
            }
            console.log('[Playwright Service] Status query successful:', {
                executionId: data.id,
                status: data.status,
                progress: data.progress_percentage,
                currentStep: data.current_step
            });
            return data;
        }
        catch (error) {
            console.error('[Playwright Service] Failed to get test execution status:', error);
            throw error;
        }
    }
    async getTestExecutionResult(executionId) {
        try {
            console.log('[Playwright Service] Getting test execution result for:', executionId);
            const { data, error } = await this.supabase
                .from('m2_test_results')
                .select('id, status, result_summary, screenshots, videos, error_details, execution_time_ms, raw_data, created_at, updated_at')
                .eq('id', executionId)
                .eq('test_type', 'playwright')
                .single();
            if (error) {
                console.error('[Playwright Service] Database query failed:', error);
                throw new Error(`Failed to get test execution result: ${error.message}`);
            }
            if (!data) {
                throw new Error(`Test execution result not found: ${executionId}`);
            }
            if (data.status !== 'completed' && data.status !== 'failed') {
                console.warn('[Playwright Service] Test is not completed yet:', data.status);
            }
            console.log('[Playwright Service] Result query successful:', {
                executionId: data.id,
                status: data.status,
                hasResultSummary: !!data.result_summary,
                hasError: !!data.error_details,
                hasRawData: !!data.raw_data
            });
            return data;
        }
        catch (error) {
            console.error('[Playwright Service] Failed to get test execution result:', error);
            throw error;
        }
    }
    async updateTestStatus(executionId, status, currentStep) {
        try {
            const { error } = await this.supabase
                .from('m2_test_results')
                .update({
                status: status,
                current_step: currentStep,
                updated_at: new Date().toISOString()
            })
                .eq('id', executionId);
            if (error) {
                console.error('[Playwright Service] Failed to update test status:', error);
            }
        }
        catch (error) {
            console.error('[Playwright Service] Failed to update test status:', error);
        }
    }
    generateTestDescription(scenarioCode) {
        try {
            const lines = scenarioCode.split('\n').filter(line => line.trim());
            const actions = [];
            for (const line of lines) {
                if (line.includes('goto(')) {
                    const urlMatch = line.match(/goto\(['"]([^'"]+)['"]/);
                    if (urlMatch) {
                        actions.push(`페이지 접속: ${urlMatch[1]}`);
                    }
                }
                else if (line.includes('click(')) {
                    const clickMatch = line.match(/click\(['"]([^'"]+)['"]/);
                    if (clickMatch) {
                        actions.push(`클릭: ${clickMatch[1]}`);
                    }
                }
                else if (line.includes('fill(')) {
                    const fillMatch = line.match(/fill\(['"]([^'"]+)['"]/);
                    if (fillMatch) {
                        actions.push(`입력: ${fillMatch[1]}`);
                    }
                }
                else if (line.includes('toBeVisible()')) {
                    const visibleMatch = line.match(/toBeVisible\(\)/);
                    if (visibleMatch) {
                        actions.push('요소 존재 확인');
                    }
                }
                else if (line.includes('screenshot(')) {
                    actions.push('스크린샷 촬영');
                }
            }
            if (actions.length > 0) {
                return `Playwright E2E 테스트: ${actions.slice(0, 3).join(', ')}${actions.length > 3 ? '...' : ''}`;
            }
            else {
                return 'Playwright E2E 테스트: 사용자 정의 시나리오';
            }
        }
        catch (error) {
            console.warn('[Playwright Service] Failed to generate test description:', error);
            return 'Playwright E2E 테스트: 사용자 정의 시나리오';
        }
    }
    async getPlaywrightTestTypeId() {
        try {
            const { data, error } = await this.supabase
                .from('m2_test_types')
                .select('id')
                .eq('name', 'playwright')
                .single();
            if (error) {
                console.warn('[Playwright Service] Playwright test type not found, using null');
                return null;
            }
            return data.id;
        }
        catch (error) {
            console.warn('[Playwright Service] Failed to get playwright test type ID, using null');
            return null;
        }
    }
    async cleanup() {
        try {
            await this.mcpWrapper.cleanup();
            console.log('[Playwright Service] Cleanup completed successfully');
        }
        catch (error) {
            console.error('[Playwright Service] Cleanup failed:', error);
        }
    }
}
exports.PlaywrightTestService = PlaywrightTestService;
//# sourceMappingURL=playwright-test-service.js.map