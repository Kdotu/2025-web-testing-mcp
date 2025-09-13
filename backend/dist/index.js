"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const test_routes_1 = __importDefault(require("./routes/test-routes"));
const test_results_1 = require("./routes/test-results");
const test_types_1 = require("./routes/test-types");
const test_metrics_1 = __importDefault(require("./routes/test-metrics"));
const test_manage_1 = __importDefault(require("./routes/test-manage"));
const settings_1 = require("./routes/settings");
const test_settings_1 = require("./routes/test-settings");
const test_layouts_1 = require("./routes/test-layouts");
const dynamic_settings_1 = require("./routes/dynamic-settings");
const db_status_1 = require("./routes/db-status");
const save_settings_1 = require("./routes/save-settings");
const documents_1 = __importDefault(require("./routes/documents"));
const mcp_status_1 = __importDefault(require("./routes/mcp-status"));
const playwright_test_1 = __importDefault(require("./routes/playwright-test"));
const mcp_playwright_1 = __importDefault(require("./routes/mcp-playwright"));
const supabase_client_1 = require("./services/supabase-client");
const test_result_service_1 = require("./services/test-result-service");
process.env.TZ = 'Asia/Seoul';
const app = (0, express_1.default)();
const PORT = process.env['PORT'] || 3101;
const allowedOrigins = [
    'http://localhost:3100',
    'http://localhost:3000',
    'https://2025-web-testing-mcp.netlify.app'
];
if (process.env['CORS_ORIGIN']) {
    allowedOrigins.push(process.env['CORS_ORIGIN']);
}
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express_1.default.json());
app.use('/api/test', test_routes_1.default);
app.use('/api/test-results', test_results_1.testResultRoutes);
app.use('/api/test-types', test_types_1.testTypeRoutes);
app.use('/api/test-settings', test_settings_1.testSettingsRoutes);
app.use('/api/test-layouts', test_layouts_1.testLayoutRoutes);
app.use('/api/dynamic-settings', dynamic_settings_1.dynamicSettingsRoutes);
app.use('/api/test-metrics', test_metrics_1.default);
app.use('/api/test-manage', test_manage_1.default);
app.use('/api/documents', documents_1.default);
app.use('/api', mcp_status_1.default);
app.use('/api/playwright', playwright_test_1.default);
app.use('/api/mcp/playwright', mcp_playwright_1.default);
app.use('/get-settings', settings_1.settingsRoutes);
app.use('/test-results', test_results_1.testResultRoutes);
app.use('/test-types', test_types_1.testTypeRoutes);
app.use('/db-status', db_status_1.dbStatusRoutes);
app.use('/save-settings', save_settings_1.saveSettingsRoutes);
app.get('/health', async (_req, res) => {
    const now = new Date();
    console.log(`Health check at ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    try {
        const testResultService = new test_result_service_1.TestResultService();
        const dbStatus = await testResultService.testDatabaseConnection();
        res.json({
            success: true,
            status: 'ok',
            timestamp: now.toISOString(),
            timezone: 'Asia/Seoul',
            database: {
                connected: dbStatus.connected,
                responseTime: dbStatus.responseTime,
                lastError: dbStatus.lastError
            }
        });
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.json({
            success: false,
            status: 'error',
            timestamp: now.toISOString(),
            timezone: 'Asia/Seoul',
            database: {
                connected: false,
                responseTime: null,
                lastError: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});
async function checkAndUpdateRunningTests() {
    try {
        console.log('🔍 Checking for running tests that may have timed out...');
        const testResultService = new test_result_service_1.TestResultService();
        const runningTests = await testResultService.getRunningTests();
        if (runningTests.length === 0) {
            console.log('✅ No running tests found');
            return;
        }
        console.log(`📊 Found ${runningTests.length} running tests`);
        const now = new Date();
        const timeoutThreshold = 10 * 60 * 1000;
        let updatedCount = 0;
        let failedCount = 0;
        for (const test of runningTests) {
            console.log(`🔍 Processing test: ${test.testId}`);
            console.log(`   - Created at: ${test.createdAt}`);
            console.log(`   - Current status: ${test.status}`);
            console.log(`   - Current step: ${test.currentStep}`);
            const createdAt = new Date(test.createdAt);
            const timeDiff = now.getTime() - createdAt.getTime();
            const minutesElapsed = Math.round(timeDiff / 1000 / 60);
            console.log(`   - Time elapsed: ${minutesElapsed} minutes (${timeDiff}ms)`);
            console.log(`   - Timeout threshold: 10 minutes (${timeoutThreshold}ms)`);
            if (timeDiff > timeoutThreshold) {
                console.log(`⏰ Test ${test.testId} has been running for ${minutesElapsed} minutes, marking as failed`);
                const updatedResult = {
                    ...test,
                    status: 'failed',
                    currentStep: 'Test timeout after 10 minutes (server restart)',
                    updatedAt: now.toISOString()
                };
                console.log(`🔄 Attempting to update test ${test.testId} with data:`, {
                    testId: updatedResult.testId,
                    status: updatedResult.status,
                    currentStep: updatedResult.currentStep,
                    updatedAt: updatedResult.updatedAt
                });
                try {
                    await testResultService.updateResult(updatedResult);
                    console.log(`✅ Test ${test.testId} status updated to failed`);
                    updatedCount++;
                }
                catch (updateError) {
                    console.error(`❌ Failed to update test ${test.testId}:`, updateError);
                    console.error(`   Error details:`, {
                        message: updateError.message,
                        code: updateError.code,
                        details: updateError.details,
                        hint: updateError.hint
                    });
                    failedCount++;
                }
            }
            else {
                console.log(`✅ Test ${test.testId} is still within timeout period (${minutesElapsed} minutes)`);
            }
        }
        console.log(`📈 Summary: Updated ${updatedCount} tests to failed status, ${failedCount} updates failed`);
    }
    catch (error) {
        console.error('❌ Error checking running tests:', error);
        console.error('   Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
    }
}
app.listen(PORT, async () => {
    const now = new Date();
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`⏰ Server started at ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    console.log(`🌍 Timezone: Asia/Seoul`);
    (0, supabase_client_1.debugEnvironmentVariables)();
    await checkAndUpdateRunningTests();
});
//# sourceMappingURL=index.js.map