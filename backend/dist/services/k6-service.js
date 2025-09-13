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
exports.K6Service = void 0;
const path_1 = require("path");
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const mcp_service_wrapper_1 = require("./mcp-service-wrapper");
class K6Service {
    constructor() {
        this.runningTests = new Map();
        this.testResults = new Map();
        this.timeoutTimers = new Map();
        this.TIMEOUT_DURATION = 10 * 60 * 1000;
        this.mcpWrapper = new mcp_service_wrapper_1.MCPServiceWrapper();
    }
    async executeTest(testId, config) {
        console.log('[K6Service] Executing test via direct execution');
        try {
            this.runningTests.set(testId, { status: 'running', startTime: new Date() });
            this.setTestTimeout(testId);
            const scriptPath = await this.generateK6Script(testId, config);
            const result = await this.executeK6Direct(scriptPath, config);
            console.log('k6 result:', result);
            this.parseK6Output(testId, result, config);
            await this.handleTestCompletion(testId, 'completed');
        }
        catch (error) {
            console.error('Failed to execute k6 test:', error);
            await this.handleTestCompletion(testId, 'failed');
            throw error;
        }
    }
    async executeTestViaMCP(testId, config) {
        console.log('[K6Service] Executing test via MCP server');
        try {
            this.runningTests.set(testId, { status: 'running', startTime: new Date() });
            this.setTestTimeout(testId);
            const scriptPath = await this.generateK6Script(testId, config);
            const mcpResult = await this.mcpWrapper.executeK6Test({
                ...config,
                scriptPath
            });
            console.log('k6 MCP result:', mcpResult);
            if (mcpResult.success) {
                const k6Output = mcpResult.output || mcpResult.data?.result || '';
                console.log('Parsing k6 output for testId:', testId);
                console.log('Output length:', k6Output.length);
                console.log('MCP result structure:', {
                    hasOutput: !!mcpResult.output,
                    hasData: !!mcpResult.data,
                    hasDataResult: !!mcpResult.data?.result,
                    outputLength: mcpResult.output?.length || 0,
                    dataResultLength: mcpResult.data?.result?.length || 0
                });
                if (k6Output.includes('Error executing k6 test:') ||
                    k6Output.includes('Request Failed') ||
                    k6Output.includes('connectex: A connection attempt failed')) {
                    console.error('k6 test failed due to network/connection errors');
                    this.handleTestCompletion(testId, 'failed');
                    throw new Error('k6 test failed: Network connection error');
                }
                if (k6Output.includes('thresholds on metrics') ||
                    k6Output.includes('level=error')) {
                    console.error('k6 test failed due to threshold violations');
                    this.handleTestCompletion(testId, 'failed');
                    throw new Error('k6 test failed: Performance thresholds exceeded');
                }
                if (!k6Output.includes('█ TOTAL RESULTS') &&
                    !k6Output.includes('http_req_duration') &&
                    !k6Output.includes('iterations')) {
                    console.error('k6 test failed: No valid metrics found in output');
                    this.handleTestCompletion(testId, 'failed');
                    throw new Error('k6 test failed: Invalid output format');
                }
                this.parseK6Output(testId, k6Output, config);
                this.handleTestCompletion(testId, 'completed');
            }
            else {
                console.error('MCP k6 test execution failed:', mcpResult.error);
                this.handleTestCompletion(testId, 'failed');
                throw new Error(mcpResult.error || 'MCP k6 test execution failed');
            }
        }
        catch (error) {
            console.error('Failed to execute k6 test via MCP:', error);
            this.handleTestCompletion(testId, 'failed');
            throw error;
        }
    }
    async executeK6Direct(scriptPath, config) {
        return new Promise((resolve, reject) => {
            console.log(`Executing k6 test directly: ${scriptPath}`);
            console.log(`Config: duration=${config.duration}, vus=${config.vus}`);
            const k6Process = (0, child_process_1.spawn)('k6', [
                'run',
                '--duration', config.duration || '30s',
                '--vus', String(config.vus || 10),
                scriptPath
            ], {
                env: {
                    ...process.env
                }
            });
            let output = '';
            let errorOutput = '';
            k6Process.stdout.on('data', (data) => {
                const dataStr = data.toString();
                output += dataStr;
                this.parseK6Progress(config.id || '', dataStr);
            });
            k6Process.stderr.on('data', (data) => {
                const dataStr = data.toString();
                errorOutput += dataStr;
                console.error('k6 error:', dataStr);
            });
            k6Process.on('close', (code) => {
                console.log(`k6 process exited with code: ${code}`);
                if (code === 0) {
                    resolve(output);
                }
                else {
                    reject(new Error(`k6 execution failed (code ${code}): ${errorOutput}`));
                }
            });
            k6Process.on('error', (error) => {
                console.error('k6 process error:', error);
                reject(error);
            });
        });
    }
    async cancelTest(testId) {
        this.clearTestTimeout(testId);
        this.runningTests.delete(testId);
        this.handleTestCompletion(testId, 'cancelled');
    }
    async generateK6Script(testId, config) {
        const scriptContent = this.createK6ScriptContent(config);
        const scriptPath = (0, path_1.join)(process.cwd(), 'temp', `${testId}.js`);
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const tempDir = (0, path_1.join)(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        fs.writeFileSync(scriptPath, scriptContent);
        if (process.env['NODE_ENV'] === 'production') {
            try {
                const { createClient } = await Promise.resolve().then(() => __importStar(require('@supabase/supabase-js')));
                const supabase = createClient(process.env['SUPABASE_URL'], process.env['SUPABASE_SERVICE_ROLE_KEY']);
                await supabase
                    .from('m2_test_scripts')
                    .upsert({
                    test_id: testId,
                    script_content: scriptContent,
                    created_at: new Date().toISOString()
                });
                console.log(`Script backed up to Supabase for testId: ${testId}`);
            }
            catch (error) {
                console.error('Failed to backup script to Supabase:', error);
            }
        }
        return scriptPath;
    }
    createK6ScriptContent(config) {
        let targetUrl = config.url || config.targetUrl || 'http://[::1]:3101/api/test-results';
        if (targetUrl.includes('localhost')) {
            targetUrl = targetUrl.replace(/localhost/g, '[::1]');
            targetUrl = targetUrl.replace(/^https:\/\//, 'http://');
            console.log('Backend: URL converted from localhost to IPv6 HTTP:', config.url, '->', targetUrl);
        }
        const duration = config.duration || '30s';
        const vus = config.vus || 10;
        console.log('Creating k6 script with targetUrl:', targetUrl);
        return `
import http from "k6/http";
import { sleep } from "k6";
import { check } from "k6";

export const options = {
  vus: ${vus},
  duration: "${duration}",
  thresholds: {
    http_req_duration: ["p(95)<5000"], // 2000ms에서 5000ms로 증가
    http_req_failed: ["rate<0.8"], // 0.5에서 0.8로 증가
  },
};

export default function () {
  const response = http.get("${targetUrl}");
  
  check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 5000ms": (r) => r.timings.duration < 5000, // 2000ms에서 5000ms로 증가
  });
  
  sleep(1);
}
`;
    }
    parseK6Output(testId, output, config) {
        console.log('Parsing k6 output for testId:', testId);
        console.log('Output length:', output.length);
        console.log('Config:', config);
        try {
            const metrics = this.extractMetrics(output);
            const summary = this.extractSummary(output);
            const detailedMetrics = this.extractDetailedMetrics(output);
            this.saveTestResult(testId, metrics, summary, output, config);
            this.saveDetailedMetrics(testId, detailedMetrics);
            console.log('k6 output parsed and saved to DB');
        }
        catch (error) {
            console.error('Failed to parse k6 output:', error);
        }
    }
    extractMetrics(output) {
        const metrics = {
            http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
            http_req_rate: 0,
            http_req_failed: 0,
            vus: 0,
            vus_max: 0
        };
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('http_req_duration')) {
                let match = line.match(/avg=([\d.]+)ms\s+min=([\d.]+)ms\s+med=([\d.]+)ms\s+max=([\d.]+)ms\s+p\(90\)=([\d.]+)ms\s+p\(95\)=([\d.]+)ms/);
                if (match && match[1] && match[2] && match[3] && match[4] && match[6]) {
                    metrics.http_req_duration = {
                        avg: parseFloat(match[1]),
                        min: parseFloat(match[2]),
                        max: parseFloat(match[4]),
                        p95: parseFloat(match[6])
                    };
                }
                else {
                    match = line.match(/avg=([\d.]+)s\s+min=([\d.]+)s\s+max=([\d.]+)s.*p\(95\)=([\d.]+)s/);
                    if (match && match[1] && match[2] && match[3] && match[4]) {
                        metrics.http_req_duration = {
                            avg: parseFloat(match[1]) * 1000,
                            min: parseFloat(match[2]) * 1000,
                            max: parseFloat(match[3]) * 1000,
                            p95: parseFloat(match[4]) * 1000
                        };
                    }
                }
            }
            if (line.includes('http_req_rate')) {
                const match = line.match(/([\d.]+)\s+req\/s/);
                if (match && match[1]) {
                    metrics.http_req_rate = parseFloat(match[1]);
                }
            }
            if (line.includes('http_req_failed')) {
                const match = line.match(/([\d.]+)%\s+[✓✓]\s+(\d+)\s+\/\s+(\d+)/);
                if (match && match[1]) {
                    metrics.http_req_failed = parseFloat(match[1]);
                }
                else {
                    const match2 = line.match(/([\d.]+)%\s+(\d+)\s+out\s+of\s+(\d+)/);
                    if (match2 && match2[1]) {
                        metrics.http_req_failed = parseFloat(match2[1]);
                    }
                }
            }
            if (line.includes('vus') && !line.includes('vus_max')) {
                const match = line.match(/(\d+)\s+min=(\d+)\s+max=(\d+)/);
                if (match && match[1] && match[3]) {
                    metrics.vus = parseInt(match[1]);
                    metrics.vus_max = parseInt(match[3]);
                }
            }
        }
        console.log('Extracted metrics:', metrics);
        return metrics;
    }
    extractSummary(output) {
        const summary = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            duration: 0
        };
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('http_reqs') && !line.includes('http_req_rate')) {
                const match = line.match(/(\d+)\s+[\d.]+\/s/);
                if (match && match[1]) {
                    summary.totalRequests = parseInt(match[1]);
                }
            }
            if (line.includes('http_req_failed')) {
                const match = line.match(/(\d+)\s+\/\s+(\d+)/);
                if (match && match[1]) {
                    summary.failedRequests = parseInt(match[1]);
                    summary.successfulRequests = (summary.totalRequests || 0) - summary.failedRequests;
                }
                else {
                    const match2 = line.match(/(\d+)\s+out\s+of\s+(\d+)/);
                    if (match2 && match2[1]) {
                        summary.failedRequests = parseInt(match2[1]);
                        summary.successfulRequests = (summary.totalRequests || 0) - summary.failedRequests;
                    }
                }
            }
            if (line.includes('running') && line.includes('VUs')) {
                const match = line.match(/running\s+\((\d+)m(\d+)\.\d+s\)/);
                if (match && match[1] && match[2]) {
                    summary.duration = parseInt(match[1]) * 60 + parseInt(match[2]);
                }
            }
        }
        console.log('Extracted summary:', summary);
        return summary;
    }
    extractDetailedMetrics(output) {
        const metrics = {};
        try {
            const httpDurationMatch = output.match(/http_req_duration.*?: avg=([\d.]+)ms min=([\d.]+)ms med=([\d.]+)ms max=([\d.]+)ms p\(90\)=([\d.]+)ms p\(95\)=([\d.]+)ms/);
            if (httpDurationMatch && httpDurationMatch[1] && httpDurationMatch[2] && httpDurationMatch[3] && httpDurationMatch[4] && httpDurationMatch[5] && httpDurationMatch[6]) {
                metrics.http_req_duration_avg = parseFloat(httpDurationMatch[1]);
                metrics.http_req_duration_min = parseFloat(httpDurationMatch[2]);
                metrics.http_req_duration_med = parseFloat(httpDurationMatch[3]);
                metrics.http_req_duration_max = parseFloat(httpDurationMatch[4]);
                metrics.http_req_duration_p90 = parseFloat(httpDurationMatch[5]);
                metrics.http_req_duration_p95 = parseFloat(httpDurationMatch[6]);
            }
            const httpWaitingMatch = output.match(/http_req_waiting.*?: avg=([\d.]+)ms min=([\d.]+)ms med=([\d.]+)ms max=([\d.]+)ms p\(90\)=([\d.]+)ms p\(95\)=([\d.]+)ms/);
            if (httpWaitingMatch && httpWaitingMatch[1] && httpWaitingMatch[2] && httpWaitingMatch[3] && httpWaitingMatch[4] && httpWaitingMatch[5] && httpWaitingMatch[6]) {
                metrics.http_req_waiting_avg = parseFloat(httpWaitingMatch[1]);
                metrics.http_req_waiting_min = parseFloat(httpWaitingMatch[2]);
                metrics.http_req_waiting_med = parseFloat(httpWaitingMatch[3]);
                metrics.http_req_waiting_max = parseFloat(httpWaitingMatch[4]);
                metrics.http_req_waiting_p90 = parseFloat(httpWaitingMatch[5]);
                metrics.http_req_waiting_p95 = parseFloat(httpWaitingMatch[6]);
            }
            const httpConnectingMatch = output.match(/http_req_connecting.*?: avg=([\d.]+)ms min=([\d.]+)ms med=([\d.]+)ms max=([\d.]+)ms p\(90\)=([\d.]+)ms p\(95\)=([\d.]+)ms/);
            if (httpConnectingMatch && httpConnectingMatch[1] && httpConnectingMatch[2] && httpConnectingMatch[3] && httpConnectingMatch[4] && httpConnectingMatch[5] && httpConnectingMatch[6]) {
                metrics.http_req_connecting_avg = parseFloat(httpConnectingMatch[1]);
                metrics.http_req_connecting_min = parseFloat(httpConnectingMatch[2]);
                metrics.http_req_connecting_med = parseFloat(httpConnectingMatch[3]);
                metrics.http_req_connecting_max = parseFloat(httpConnectingMatch[4]);
                metrics.http_req_connecting_p90 = parseFloat(httpConnectingMatch[5]);
                metrics.http_req_connecting_p95 = parseFloat(httpConnectingMatch[6]);
            }
            const httpBlockedMatch = output.match(/http_req_blocked.*?: avg=([\d.]+)ms min=([\d.]+)ms med=([\d.]+)ms max=([\d.]+)ms p\(90\)=([\d.]+)ms p\(95\)=([\d.]+)ms/);
            if (httpBlockedMatch && httpBlockedMatch[1] && httpBlockedMatch[2] && httpBlockedMatch[3] && httpBlockedMatch[4] && httpBlockedMatch[5] && httpBlockedMatch[6]) {
                metrics.http_req_blocked_avg = parseFloat(httpBlockedMatch[1]);
                metrics.http_req_blocked_min = parseFloat(httpBlockedMatch[2]);
                metrics.http_req_blocked_med = parseFloat(httpBlockedMatch[3]);
                metrics.http_req_blocked_max = parseFloat(httpBlockedMatch[4]);
                metrics.http_req_blocked_p90 = parseFloat(httpBlockedMatch[5]);
                metrics.http_req_blocked_p95 = parseFloat(httpBlockedMatch[6]);
            }
            const httpFailedMatch = output.match(/http_req_failed.*?: ([\d.]+)%/);
            if (httpFailedMatch && httpFailedMatch[1]) {
                metrics.http_req_failed_rate = parseFloat(httpFailedMatch[1]);
            }
            const httpReqsMatch = output.match(/http_reqs.*?: (\d+)\s+([\d.]+)\/s/);
            if (httpReqsMatch && httpReqsMatch[1] && httpReqsMatch[2]) {
                metrics.http_reqs_total = parseInt(httpReqsMatch[1]);
                metrics.http_reqs_rate = parseFloat(httpReqsMatch[2]);
            }
            const checksTotalMatch = output.match(/checks_total.*?: (\d+)/);
            const checksSucceededMatch = output.match(/checks_succeeded.*?: ([\d.]+)% (\d+) out of (\d+)/);
            const checksFailedMatch = output.match(/checks_failed.*?: ([\d.]+)% (\d+) out of (\d+)/);
            if (checksTotalMatch && checksTotalMatch[1]) {
                metrics.checks_total = parseInt(checksTotalMatch[1]);
            }
            if (checksSucceededMatch && checksSucceededMatch[1] && checksSucceededMatch[2]) {
                metrics.checks_succeeded_rate = parseFloat(checksSucceededMatch[1]);
                metrics.checks_succeeded = parseInt(checksSucceededMatch[2]);
            }
            if (checksFailedMatch && checksFailedMatch[2]) {
                metrics.checks_failed = parseInt(checksFailedMatch[2]);
            }
            const iterationsMatch = output.match(/iterations.*?: (\d+)\s+([\d.]+)\/s/);
            if (iterationsMatch && iterationsMatch[1] && iterationsMatch[2]) {
                metrics.iterations_total = parseInt(iterationsMatch[1]);
                metrics.iterations_rate = parseFloat(iterationsMatch[2]);
            }
            const iterationDurationMatch = output.match(/iteration_duration.*?: avg=([\d.]+)s\s+min=([\d.]+)s\s+med=([\d.]+)s\s+max=([\d.]+)s\s+p\(90\)=([\d.]+)s\s+p\(95\)=([\d.]+)s/);
            if (iterationDurationMatch && iterationDurationMatch[1] && iterationDurationMatch[2] && iterationDurationMatch[3] && iterationDurationMatch[4] && iterationDurationMatch[5] && iterationDurationMatch[6]) {
                metrics.iteration_duration_avg = parseFloat(iterationDurationMatch[1]);
                metrics.iteration_duration_min = parseFloat(iterationDurationMatch[2]);
                metrics.iteration_duration_med = parseFloat(iterationDurationMatch[3]);
                metrics.iteration_duration_max = parseFloat(iterationDurationMatch[4]);
                metrics.iteration_duration_p90 = parseFloat(iterationDurationMatch[5]);
                metrics.iteration_duration_p95 = parseFloat(iterationDurationMatch[6]);
            }
            const vusMatch = output.match(/vus.*?: (\d+)\s+min=(\d+)\s+max=(\d+)/);
            if (vusMatch && vusMatch[1] && vusMatch[2] && vusMatch[3]) {
                metrics.vus_avg = parseInt(vusMatch[1]);
                metrics.vus_min = parseInt(vusMatch[2]);
                metrics.vus_max = parseInt(vusMatch[3]);
            }
            const dataReceivedMatch = output.match(/data_received.*?: ([\d.]+) (MB|KB)\s+([\d.]+) (MB|KB)\/s/);
            if (dataReceivedMatch && dataReceivedMatch[1] && dataReceivedMatch[2] && dataReceivedMatch[3] && dataReceivedMatch[4]) {
                const size = parseFloat(dataReceivedMatch[1]);
                const unit = dataReceivedMatch[2];
                const rate = parseFloat(dataReceivedMatch[3]);
                const rateUnit = dataReceivedMatch[4];
                if (unit === 'MB') {
                    metrics.data_received_bytes = Math.round(size * 1024 * 1024);
                }
                else if (unit === 'KB') {
                    metrics.data_received_bytes = Math.round(size * 1024);
                }
                if (rateUnit === 'MB') {
                    metrics.data_received_rate = rate * 1024 * 1024;
                }
                else if (rateUnit === 'KB') {
                    metrics.data_received_rate = rate * 1024;
                }
            }
            const dataSentMatch = output.match(/data_sent.*?: ([\d.]+) (MB|KB)\s+([\d.]+) (MB|KB|B)\/s/);
            if (dataSentMatch && dataSentMatch[1] && dataSentMatch[2] && dataSentMatch[3] && dataSentMatch[4]) {
                const size = parseFloat(dataSentMatch[1]);
                const unit = dataSentMatch[2];
                const rate = parseFloat(dataSentMatch[3]);
                const rateUnit = dataSentMatch[4];
                if (unit === 'MB') {
                    metrics.data_sent_bytes = Math.round(size * 1024 * 1024);
                }
                else if (unit === 'KB') {
                    metrics.data_sent_bytes = Math.round(size * 1024);
                }
                if (rateUnit === 'MB') {
                    metrics.data_sent_rate = rate * 1024 * 1024;
                }
                else if (rateUnit === 'KB') {
                    metrics.data_sent_rate = rate * 1024;
                }
                else if (rateUnit === 'B') {
                    metrics.data_sent_rate = rate;
                }
            }
            const errorsMatch = output.match(/errors.*?: ([\d.]+)% (\d+) out of (\d+)/);
            if (errorsMatch && errorsMatch[1] && errorsMatch[2]) {
                metrics.errors_rate = parseFloat(errorsMatch[1]);
                metrics.errors_total = parseInt(errorsMatch[2]);
            }
            const thresholdResults = this.parseThresholdResults(output);
            metrics.threshold_results = thresholdResults;
            metrics.thresholds_passed = thresholdResults?.passed || 0;
            metrics.thresholds_failed = thresholdResults?.failed || 0;
        }
        catch (error) {
            console.error('Failed to extract detailed metrics:', error);
        }
        return metrics;
    }
    parseThresholdResults(output) {
        const results = { passed: 0, failed: 0, details: {} };
        try {
            const thresholdsSection = output.match(/█ THRESHOLDS([\s\S]*?)(?=█|$)/);
            if (thresholdsSection && thresholdsSection[1]) {
                const thresholdLines = thresholdsSection[1].split('\n');
                for (const line of thresholdLines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine && !trimmedLine.startsWith('█')) {
                        if (trimmedLine.includes('✓')) {
                            results.passed++;
                            const metricName = trimmedLine.match(/^\s*([^\s]+)/)?.[1];
                            if (metricName) {
                                results.details[metricName] = { status: 'passed', value: trimmedLine };
                            }
                        }
                        else if (trimmedLine.includes('✗')) {
                            results.failed++;
                            const metricName = trimmedLine.match(/^\s*([^\s]+)/)?.[1];
                            if (metricName) {
                                results.details[metricName] = { status: 'failed', value: trimmedLine };
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Failed to parse threshold results:', error);
        }
        return results;
    }
    async saveDetailedMetrics(testId, metrics) {
        try {
            const { createServiceClient } = await Promise.resolve().then(() => __importStar(require('./supabase-client')));
            const supabase = createServiceClient();
            const metricRecords = this.convertMetricsToRecords(testId, metrics);
            if (metricRecords.length > 0) {
                const { error: dbError } = await supabase
                    .from('m2_test_metrics')
                    .insert(metricRecords);
                if (dbError) {
                    console.error('Failed to save detailed metrics to database:', dbError);
                    if (process.env['NODE_ENV'] === 'development') {
                        console.warn('⚠️ Continuing without saving detailed metrics due to database error');
                        return;
                    }
                }
                else {
                    console.log(`Successfully saved ${metricRecords.length} metric records to DB for test:`, testId);
                }
            }
        }
        catch (error) {
            console.error('Failed to save detailed metrics:', error);
            if (process.env['NODE_ENV'] === 'development') {
                console.warn('⚠️ Continuing without saving detailed metrics due to error');
            }
        }
    }
    convertMetricsToRecords(testId, metrics) {
        const records = [];
        const now = new Date().toISOString();
        if (metrics.http_req_duration_avg !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'http',
                metric_name: 'req_duration_avg',
                value: metrics.http_req_duration_avg,
                unit: 'ms',
                description: 'HTTP 요청 평균 응답 시간',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.http_req_duration_p95 !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'http',
                metric_name: 'req_duration_p95',
                value: metrics.http_req_duration_p95,
                unit: 'ms',
                description: 'HTTP 요청 95퍼센타일 응답 시간',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.http_req_failed_rate !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'http',
                metric_name: 'req_failed_rate',
                value: metrics.http_req_failed_rate,
                unit: '%',
                description: 'HTTP 요청 실패율',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.http_reqs_total !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'http',
                metric_name: 'reqs_total',
                value: metrics.http_reqs_total,
                unit: 'count',
                description: '총 HTTP 요청 수',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.http_reqs_rate !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'http',
                metric_name: 'reqs_rate',
                value: metrics.http_reqs_rate,
                unit: 'req/s',
                description: 'HTTP 요청 속도',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.http_req_waiting_avg !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'http',
                metric_name: 'req_waiting_avg',
                value: metrics.http_req_waiting_avg,
                unit: 'ms',
                description: 'HTTP 요청 평균 대기 시간',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.http_req_waiting_p95 !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'http',
                metric_name: 'req_waiting_p95',
                value: metrics.http_req_waiting_p95,
                unit: 'ms',
                description: 'HTTP 요청 95퍼센타일 대기 시간',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.http_req_connecting_avg !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'http',
                metric_name: 'req_connecting_avg',
                value: metrics.http_req_connecting_avg,
                unit: 'ms',
                description: 'HTTP 요청 평균 연결 시간',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.http_req_connecting_p95 !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'http',
                metric_name: 'req_connecting_p95',
                value: metrics.http_req_connecting_p95,
                unit: 'ms',
                description: 'HTTP 요청 95퍼센타일 연결 시간',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.http_req_blocked_avg !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'http',
                metric_name: 'req_blocked_avg',
                value: metrics.http_req_blocked_avg,
                unit: 'ms',
                description: 'HTTP 요청 평균 차단 시간',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.http_req_blocked_p95 !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'http',
                metric_name: 'req_blocked_p95',
                value: metrics.http_req_blocked_p95,
                unit: 'ms',
                description: 'HTTP 요청 95퍼센타일 차단 시간',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.checks_total !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'checks',
                metric_name: 'total',
                value: metrics.checks_total,
                unit: 'count',
                description: '총 체크 수',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.checks_succeeded !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'checks',
                metric_name: 'succeeded',
                value: metrics.checks_succeeded,
                unit: 'count',
                description: '성공한 체크 수',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.checks_succeeded_rate !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'checks',
                metric_name: 'succeeded_rate',
                value: metrics.checks_succeeded_rate,
                unit: '%',
                description: '체크 성공률',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.iterations_total !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'execution',
                metric_name: 'iterations_total',
                value: metrics.iterations_total,
                unit: 'count',
                description: '총 반복 수',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.iterations_rate !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'execution',
                metric_name: 'iterations_rate',
                value: metrics.iterations_rate,
                unit: 'iter/s',
                description: '반복 속도',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.iteration_duration_avg !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'execution',
                metric_name: 'duration_avg',
                value: metrics.iteration_duration_avg,
                unit: 's',
                description: '평균 반복 시간',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.vus_avg !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'vus',
                metric_name: 'avg',
                value: metrics.vus_avg,
                unit: 'count',
                description: '평균 가상 사용자 수',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.vus_min !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'vus',
                metric_name: 'min',
                value: metrics.vus_min,
                unit: 'count',
                description: '최소 가상 사용자 수',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.vus_max !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'vus',
                metric_name: 'max',
                value: metrics.vus_max,
                unit: 'count',
                description: '최대 가상 사용자 수',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.data_received_bytes !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'network',
                metric_name: 'data_received_bytes',
                value: metrics.data_received_bytes,
                unit: 'bytes',
                description: '수신된 데이터량',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.data_sent_bytes !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'network',
                metric_name: 'data_sent_bytes',
                value: metrics.data_sent_bytes,
                unit: 'bytes',
                description: '송신된 데이터량',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.thresholds_passed !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'thresholds',
                metric_name: 'passed',
                value: metrics.thresholds_passed,
                unit: 'count',
                description: '통과한 임계값 수',
                created_at: now,
                updated_at: now
            });
        }
        if (metrics.thresholds_failed !== undefined) {
            records.push({
                test_id: testId,
                metric_type: 'thresholds',
                metric_name: 'failed',
                value: metrics.thresholds_failed,
                unit: 'count',
                description: '실패한 임계값 수',
                created_at: now,
                updated_at: now
            });
        }
        console.log(`Converted ${records.length} metrics to records for test: ${testId}`);
        console.log('Available metrics:', Object.keys(metrics));
        console.log('Converted records:', records.map(r => `${r.metric_type}.${r.metric_name}: ${r.value}${r.unit}`));
        return records;
    }
    parseK6Progress(testId, output) {
        try {
            const progressMatch = output.match(/\[(\d+)%\]/);
            const runningMatch = output.match(/running\s+\((\d+)m(\d+)\.\d+s\)/);
            const timeProgressMatch = output.match(/(\d+\.\d+)s\/(\d+\.\d+)s/);
            const vusMatch = output.match(/(\d+)\/(\d+)\s+VUs/);
            if (progressMatch || runningMatch || timeProgressMatch) {
                let progress = 0;
                let currentStep = 'k6 테스트 실행 중...';
                if (progressMatch && progressMatch[1]) {
                    progress = parseInt(progressMatch[1]);
                }
                else if (timeProgressMatch && timeProgressMatch[1] && timeProgressMatch[2]) {
                    const currentTime = parseFloat(timeProgressMatch[1]);
                    const totalTime = parseFloat(timeProgressMatch[2]);
                    progress = Math.min(Math.round((currentTime / totalTime) * 100), 95);
                }
                else if (runningMatch && runningMatch[1] && runningMatch[2]) {
                    const minutes = parseInt(runningMatch[1]);
                    const seconds = parseInt(runningMatch[2]);
                    const totalSeconds = minutes * 60 + seconds;
                    const durationMatch = output.match(/(\d+\.\d+)s\/(\d+\.\d+)s/);
                    let totalExpectedSeconds = 30;
                    if (durationMatch && durationMatch[2]) {
                        totalExpectedSeconds = parseFloat(durationMatch[2]);
                    }
                    progress = Math.min(Math.round((totalSeconds / totalExpectedSeconds) * 100), 95);
                }
                if (output.includes('k6 process exited') || output.includes('Test completed') ||
                    output.includes('default ✓') || output.includes('THRESHOLDS') ||
                    output.includes('checks') || output.includes('http_req_duration')) {
                    progress = 100;
                    currentStep = '테스트 완료';
                }
                if (vusMatch && vusMatch[1] && vusMatch[2] && progress < 100) {
                    const currentVUs = vusMatch[1];
                    const maxVUs = vusMatch[2];
                    currentStep = `k6 테스트 실행 중... (${currentVUs}/${maxVUs} VUs)`;
                }
                this.updateTestProgress(testId, currentStep);
            }
        }
        catch (error) {
            console.error('Failed to parse k6 progress:', error);
        }
    }
    async updateTestProgress(testId, currentStep) {
        try {
            const { TestResultService } = await Promise.resolve().then(() => __importStar(require('../services/test-result-service')));
            const testResultService = new TestResultService();
            const existingResult = await testResultService.getResultByTestId(testId);
            if (existingResult) {
                const updatedResult = {
                    ...existingResult,
                    currentStep: currentStep,
                    updatedAt: new Date().toISOString()
                };
                await testResultService.updateResult(updatedResult);
            }
        }
        catch (error) {
            console.error('Failed to update test progress:', error);
        }
    }
    extractRawData(output, config) {
        try {
            const now = new Date();
            const koreanTime = now.toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).replace(/\./g, '-').replace(/\s/g, ' ');
            const timestampLine = `====TEST START DATE ${koreanTime}====\n\n`;
            let configInfo = '';
            if (config) {
                configInfo = `------------------------------------\n-------TEST CONFIG-------\n`;
                configInfo += `Duration: ${config.duration || '30s'}\n`;
                configInfo += `Virtual Users: ${config.vus || 10}\n`;
                if (config.detailedConfig) {
                    configInfo += `Test Type: ${config.detailedConfig.testType || 'load'}\n`;
                    if (config.detailedConfig.settings) {
                        configInfo += `Settings: ${JSON.stringify(config.detailedConfig.settings, null, 2)}\n`;
                    }
                }
                configInfo += `------------------------------------\n\n`;
            }
            let processedOutput = output;
            try {
                if (output.includes('{"output":')) {
                    const jsonMatch = output.match(/\{"output":\s*"([^"]*(?:\\.[^"]*)*)"\}/);
                    if (jsonMatch && jsonMatch[1]) {
                        processedOutput = jsonMatch[1]
                            .replace(/\\n/g, '\n')
                            .replace(/\\"/g, '"')
                            .replace(/\\\\/g, '\\');
                    }
                }
            }
            catch (error) {
                console.error('Failed to parse JSON output:', error);
            }
            const startIndex = processedOutput.indexOf('k6 result:');
            if (startIndex === -1) {
                return timestampLine + configInfo + processedOutput;
            }
            return timestampLine + configInfo + processedOutput.substring(startIndex);
        }
        catch (error) {
            console.error('Error in extractRawData:', error);
            const fallbackOutput = `====TEST START DATE ${new Date().toISOString()}====\n\nError processing output: ${error}\n\nRaw output: ${output}`;
            return fallbackOutput;
        }
    }
    async saveTestResult(testId, metrics, summary, rawData, config) {
        try {
            console.log('saveTestResult called with testId:', testId);
            console.log('rawData length:', rawData.length);
            console.log('config:', config);
            const { TestResultService } = await Promise.resolve().then(() => __importStar(require('../services/test-result-service')));
            const testResultService = new TestResultService();
            const existingResult = await testResultService.getResultByTestId(testId);
            console.log('existingResult found:', !!existingResult);
            if (existingResult) {
                const extractedRawData = this.extractRawData(rawData, config);
                console.log('extractedRawData length:', extractedRawData.length);
                const updatedResult = {
                    ...existingResult,
                    metrics: { ...existingResult.metrics, ...metrics },
                    summary: { ...existingResult.summary, ...summary },
                    raw_data: extractedRawData,
                    status: 'completed',
                    updatedAt: new Date().toISOString()
                };
                await testResultService.updateResult(updatedResult);
                console.log('Test result updated in DB:', testId);
            }
            else {
                console.error('No existing result found for testId:', testId);
                const extractedRawData = this.extractRawData(rawData, config);
                console.log('Creating new result with raw_data, length:', extractedRawData.length);
                const newResult = {
                    id: (0, uuid_1.v4)(),
                    testId,
                    testType: 'load',
                    url: config?.url || '',
                    name: '',
                    status: 'completed',
                    metrics: {
                        http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
                        http_req_rate: 0,
                        http_req_failed: 0,
                        vus: 0,
                        vus_max: 0,
                        ...metrics
                    },
                    summary: {
                        totalRequests: 0,
                        successfulRequests: 0,
                        failedRequests: 0,
                        duration: 0,
                        startTime: new Date().toISOString(),
                        endTime: new Date().toISOString(),
                        ...summary
                    },
                    raw_data: extractedRawData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await testResultService.saveResult(newResult);
                console.log('New test result saved in DB:', testId);
            }
        }
        catch (error) {
            console.error('Failed to save test result to DB:', error);
        }
    }
    setTestTimeout(testId) {
        this.clearTestTimeout(testId);
        const timeoutTimer = setTimeout(async () => {
            console.log(`⏰ Test timeout reached for testId: ${testId}`);
            try {
                const { TestResultService } = await Promise.resolve().then(() => __importStar(require('./test-result-service')));
                const testResultService = new TestResultService();
                const existingResult = await testResultService.getResultByTestId(testId);
                if (existingResult) {
                    const updatedResult = {
                        ...existingResult,
                        status: 'failed',
                        currentStep: 'Test timeout after 10 minutes',
                        updatedAt: new Date().toISOString()
                    };
                    await testResultService.updateResult(updatedResult);
                    console.log(`✅ Test status updated to failed due to timeout: ${testId}`);
                }
            }
            catch (error) {
                console.error(`❌ Failed to update test status to failed: ${testId}`, error);
            }
            this.runningTests.delete(testId);
            this.timeoutTimers.delete(testId);
        }, this.TIMEOUT_DURATION);
        this.timeoutTimers.set(testId, timeoutTimer);
        console.log(`⏰ Timeout timer set for testId: ${testId} (10 minutes)`);
    }
    clearTestTimeout(testId) {
        const existingTimer = this.timeoutTimers.get(testId);
        if (existingTimer) {
            clearTimeout(existingTimer);
            this.timeoutTimers.delete(testId);
            console.log(`⏰ Timeout timer cleared for testId: ${testId}`);
        }
    }
    async handleTestCompletion(testId, status) {
        this.clearTestTimeout(testId);
        const result = this.testResults.get(testId);
        if (result) {
            result.status = status;
            result.completedAt = new Date().toISOString();
            this.testResults.set(testId, result);
        }
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            const runningTest = this.runningTests.get(testId);
            if (runningTest) {
                console.log(`Test ${testId} completed with status: ${status}`);
            }
        }
        this.cleanupTempFiles(testId);
    }
    async cleanupTempFiles(testId) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const tempDir = path.join(process.cwd(), 'data', 'temp');
            const scriptPath = path.join(tempDir, `${testId}.js`);
            if (fs.existsSync(scriptPath) && process.env['NODE_ENV'] !== 'production') {
                fs.unlinkSync(scriptPath);
                console.log(`Cleaned up temp file: ${scriptPath}`);
            }
            else if (process.env['NODE_ENV'] === 'production') {
                console.log(`Keeping temp file in production: ${scriptPath}`);
            }
        }
        catch (error) {
            console.error('Failed to cleanup temp files:', error);
        }
    }
    getRunningTests() {
        return Array.from(this.runningTests.keys());
    }
    isTestRunning(testId) {
        return this.runningTests.has(testId);
    }
    getTestResult(testId) {
        return this.testResults.get(testId);
    }
    async testTimeout(testId, timeoutMs = 30000) {
        console.log(`🧪 Testing timeout for testId: ${testId} with ${timeoutMs}ms`);
        this.runningTests.set(testId, { status: 'running', startTime: new Date() });
        setTimeout(async () => {
            console.log(`⏰ Test timeout reached for testId: ${testId}`);
            try {
                const { TestResultService } = await Promise.resolve().then(() => __importStar(require('./test-result-service')));
                const testResultService = new TestResultService();
                const existingResult = await testResultService.getResultByTestId(testId);
                if (existingResult) {
                    const updatedResult = {
                        ...existingResult,
                        status: 'failed',
                        currentStep: `Test timeout after ${timeoutMs / 1000} seconds`,
                        updatedAt: new Date().toISOString()
                    };
                    await testResultService.updateResult(updatedResult);
                    console.log(`✅ Test status updated to failed due to timeout: ${testId}`);
                }
            }
            catch (error) {
                console.error(`❌ Failed to update test status to failed: ${testId}`, error);
            }
            this.runningTests.delete(testId);
        }, timeoutMs);
        console.log(`⏰ Test timeout timer set for testId: ${testId} (${timeoutMs}ms)`);
    }
}
exports.K6Service = K6Service;
//# sourceMappingURL=k6-service.js.map