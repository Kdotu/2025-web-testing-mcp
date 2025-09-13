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
exports.LighthouseService = void 0;
const path_1 = require("path");
const child_process_1 = require("child_process");
class LighthouseService {
    constructor() {
        this.runningTests = new Map();
        this.testResults = new Map();
    }
    async executeTest(id, testId, config) {
        try {
            if (this.runningTests.has(testId)) {
                console.log(`⚠️ Lighthouse test ${testId} is already running, skipping duplicate execution`);
                return;
            }
            this.runningTests.set(testId, { status: 'running', startTime: new Date() });
            console.log(`🚀 Starting Lighthouse test ${testId} via MCP`);
            const result = await this.executeLighthouseViaMCP(config);
            console.log('Lighthouse MCP result:', result);
            await this.parseLighthouseOutput(id, testId, result, config);
            await this.handleTestCompletion(testId, 'completed');
        }
        catch (error) {
            console.error('Failed to execute Lighthouse test via MCP:', error);
            await this.handleTestCompletion(testId, 'failed');
            throw error;
        }
        finally {
            this.runningTests.delete(testId);
        }
    }
    async executeLighthouseViaMCP(config) {
        return new Promise((resolve, reject) => {
            console.log(`[MCP] Starting Lighthouse test via MCP server`);
            console.log(`[MCP] Config: url=${config.url}, device=${config.device || 'desktop'}`);
            const lighthouseServerPath = (0, path_1.join)(process.cwd(), 'mcp', 'lighthouse-mcp-server');
            const isWindows = process.platform === 'win32';
            const nodePath = isWindows ? 'node' : 'node';
            console.log(`[MCP] Node path: ${nodePath}`);
            console.log(`[MCP] Working directory: ${lighthouseServerPath}`);
            const nodeProcess = (0, child_process_1.spawn)(nodePath, ['lighthouse_server.js'], {
                cwd: lighthouseServerPath,
                env: {
                    ...process.env,
                    LIGHTHOUSE_BIN: 'lighthouse'
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
                method: 'run_audit',
                params: {
                    url: config.url,
                    device: config.device || 'desktop',
                    categories: config.categories || ['performance', 'accessibility', 'best-practices', 'seo'],
                    throttling: true
                }
            };
            console.log(`[MCP] Sending request:`, JSON.stringify(testRequest));
            nodeProcess.stdin.write(JSON.stringify(testRequest) + '\n');
            nodeProcess.stdin.end();
            console.log(`[MCP] Request sent, stdin closed`);
        });
    }
    async parseLighthouseOutput(id, testId, output, config) {
        try {
            console.log('Parsing Lighthouse output...');
            let lighthouseResult;
            if (typeof output === 'string') {
                lighthouseResult = JSON.parse(output);
            }
            else if (Array.isArray(output) && output.length > 0) {
                const firstItem = output[0];
                if (firstItem.type === 'text' && firstItem.text) {
                    try {
                        lighthouseResult = JSON.parse(firstItem.text);
                    }
                    catch (parseError) {
                        console.error('Failed to parse Lighthouse text content:', parseError);
                        throw new Error('Invalid Lighthouse result format');
                    }
                }
                else {
                    lighthouseResult = output;
                }
            }
            else {
                lighthouseResult = output;
            }
            console.log('Initial parsed result structure:', {
                hasResult: !!lighthouseResult.result,
                hasData: !!lighthouseResult.result?.data,
                topLevelKeys: Object.keys(lighthouseResult)
            });
            if (lighthouseResult.result && lighthouseResult.result.data) {
                console.log('Found result.data structure, extracting...');
                lighthouseResult = lighthouseResult.result.data;
                console.log('Extracted data structure:', {
                    hasCategories: !!lighthouseResult.categories,
                    hasMetrics: !!lighthouseResult.metrics,
                    hasAudits: !!lighthouseResult.audits,
                    categoryKeys: lighthouseResult.categories ? Object.keys(lighthouseResult.categories) : [],
                    metricKeys: lighthouseResult.metrics ? Object.keys(lighthouseResult.metrics) : []
                });
            }
            else if (lighthouseResult.data) {
                console.log('Found direct data structure, extracting...');
                lighthouseResult = lighthouseResult.data;
                console.log('Extracted data structure:', {
                    hasCategories: !!lighthouseResult.categories,
                    hasMetrics: !!lighthouseResult.metrics,
                    hasAudits: !!lighthouseResult.audits,
                    categoryKeys: lighthouseResult.categories ? Object.keys(lighthouseResult.categories) : [],
                    metricKeys: lighthouseResult.metrics ? Object.keys(lighthouseResult.metrics) : []
                });
            }
            else {
                console.log('No result.data or data structure found, using original result');
            }
            console.log('Parsed Lighthouse result structure:', {
                hasScores: !!lighthouseResult.scores,
                hasMetrics: !!lighthouseResult.metrics,
                hasCategories: !!lighthouseResult.categories,
                scoreKeys: lighthouseResult.scores ? Object.keys(lighthouseResult.scores) : [],
                metricKeys: lighthouseResult.metrics ? Object.keys(lighthouseResult.metrics) : [],
                categoryKeys: lighthouseResult.categories ? Object.keys(lighthouseResult.categories) : []
            });
            console.log('Full lighthouseResult keys:', Object.keys(lighthouseResult));
            if (lighthouseResult.categories) {
                console.log('Categories structure:', {
                    performance: lighthouseResult.categories.performance,
                    accessibility: lighthouseResult.categories.accessibility,
                    'best-practices': lighthouseResult.categories['best-practices'],
                    seo: lighthouseResult.categories.seo
                });
            }
            else {
                console.log('No categories found in lighthouseResult');
            }
            if (lighthouseResult.metrics) {
                console.log('Metrics structure:', {
                    fcp: lighthouseResult.metrics['first-contentful-paint'],
                    lcp: lighthouseResult.metrics['largest-contentful-paint'],
                    tbt: lighthouseResult.metrics['total-blocking-time'],
                    cls: lighthouseResult.metrics['cumulative-layout-shift']
                });
            }
            else {
                console.log('No metrics found in lighthouseResult');
            }
            const metrics = this.extractLighthouseMetrics(lighthouseResult);
            const summary = this.extractLighthouseSummary(lighthouseResult);
            const details = this.extractLighthouseDetails(lighthouseResult);
            let rawData;
            try {
                const rawResult = {
                    lighthouseVersion: lighthouseResult.lighthouseVersion,
                    requestedUrl: lighthouseResult.requestedUrl,
                    finalUrl: lighthouseResult.finalUrl,
                    fetchTime: lighthouseResult.fetchTime,
                    userAgent: lighthouseResult.userAgent,
                    categories: lighthouseResult.categories,
                    metrics: lighthouseResult.metrics,
                    audits: lighthouseResult.audits,
                    configSettings: lighthouseResult.configSettings,
                    environment: lighthouseResult.environment,
                    categoryGroups: lighthouseResult.categoryGroups,
                    timing: lighthouseResult.timing,
                    i18n: lighthouseResult.i18n
                };
                rawData = JSON.stringify(rawResult, null, 2);
                console.log('Raw data generated successfully, length:', rawData.length);
                console.log('Raw data preview:', rawData.substring(0, 500) + '...');
            }
            catch (e) {
                console.error('Failed to generate raw data:', e);
                rawData = typeof output === 'string' ? output : JSON.stringify(output);
            }
            this.saveLighthouseResult(id, testId, metrics, summary, details, rawData, config);
            await this.saveLighthouseMetrics(testId, lighthouseResult);
            this.handleTestCompletion(testId, 'completed');
        }
        catch (error) {
            console.error('Failed to parse Lighthouse output:', error);
            throw error;
        }
    }
    extractLighthouseMetrics(result) {
        const metrics = {
            performance: {},
            accessibility: {},
            'best-practices': {},
            seo: {}
        };
        console.log('Extracting metrics from result:', {
            hasCategories: !!result.categories,
            hasMetrics: !!result.metrics,
            hasAudits: !!result.audits
        });
        if (result.categories) {
            console.log('Categories found:', Object.keys(result.categories));
            if (result.categories.performance?.score !== undefined) {
                metrics.performance.score = Math.round(result.categories.performance.score * 100);
                console.log('Performance score:', result.categories.performance.score, '->', metrics.performance.score);
            }
            if (result.categories.accessibility?.score !== undefined) {
                metrics.accessibility.score = Math.round(result.categories.accessibility.score * 100);
                console.log('Accessibility score:', result.categories.accessibility.score, '->', metrics.accessibility.score);
            }
            if (result.categories['best-practices']?.score !== undefined) {
                metrics['best-practices'].score = Math.round(result.categories['best-practices'].score * 100);
                console.log('Best practices score:', result.categories['best-practices'].score, '->', metrics['best-practices'].score);
            }
            if (result.categories.seo?.score !== undefined) {
                metrics.seo.score = Math.round(result.categories.seo.score * 100);
                console.log('SEO score:', result.categories.seo.score, '->', metrics.seo.score);
            }
        }
        if (result.scores) {
            console.log('Scores found:', Object.keys(result.scores));
            if (result.scores.performance?.score && !metrics.performance.score) {
                metrics.performance.score = Math.round(result.scores.performance.score * 100);
            }
            if (result.scores.accessibility?.score && !metrics.accessibility.score) {
                metrics.accessibility.score = Math.round(result.scores.accessibility.score * 100);
            }
            if (result.scores['best-practices']?.score && !metrics['best-practices'].score) {
                metrics['best-practices'].score = Math.round(result.scores['best-practices'].score * 100);
            }
            if (result.scores.seo?.score && !metrics.seo.score) {
                metrics.seo.score = Math.round(result.scores.seo.score * 100);
            }
        }
        if (result.metrics) {
            console.log('Performance metrics found:', Object.keys(result.metrics));
            if (result.metrics['first-contentful-paint']?.value) {
                metrics.performance.fcp = Math.round(result.metrics['first-contentful-paint'].value);
                console.log('FCP:', result.metrics['first-contentful-paint'].value, '->', metrics.performance.fcp);
            }
            if (result.metrics['largest-contentful-paint']?.value) {
                metrics.performance.lcp = Math.round(result.metrics['largest-contentful-paint'].value);
                console.log('LCP:', result.metrics['largest-contentful-paint'].value, '->', metrics.performance.lcp);
            }
            if (result.metrics['total-blocking-time']?.value) {
                metrics.performance.tbt = Math.round(result.metrics['total-blocking-time'].value);
                console.log('TBT:', result.metrics['total-blocking-time'].value, '->', metrics.performance.tbt);
            }
            if (result.metrics['cumulative-layout-shift']?.value) {
                metrics.performance.cls = result.metrics['cumulative-layout-shift'].value;
                console.log('CLS:', result.metrics['cumulative-layout-shift'].value, '->', metrics.performance.cls);
            }
            if (result.metrics['speed-index']?.value) {
                metrics.performance.speedIndex = Math.round(result.metrics['speed-index'].value);
                console.log('Speed Index:', result.metrics['speed-index'].value, '->', metrics.performance.speedIndex);
            }
            if (result.metrics['interactive']?.value) {
                metrics.performance.tti = Math.round(result.metrics['interactive'].value);
                console.log('TTI:', result.metrics['interactive'].value, '->', metrics.performance.tti);
            }
        }
        if (result.audits) {
            console.log('Audits found for performance metrics');
            if (result.audits['first-contentful-paint']?.numericValue && !metrics.performance.fcp) {
                metrics.performance.fcp = Math.round(result.audits['first-contentful-paint'].numericValue);
            }
            if (result.audits['largest-contentful-paint']?.numericValue && !metrics.performance.lcp) {
                metrics.performance.lcp = Math.round(result.audits['largest-contentful-paint'].numericValue);
            }
            if (result.audits['max-potential-fid']?.numericValue && !metrics.performance.fid) {
                metrics.performance.fid = Math.round(result.audits['max-potential-fid'].numericValue);
            }
            if (result.audits['cumulative-layout-shift']?.numericValue && !metrics.performance.cls) {
                metrics.performance.cls = result.audits['cumulative-layout-shift'].numericValue;
            }
            if (result.audits['speed-index']?.numericValue && !metrics.performance.speedIndex) {
                metrics.performance.speedIndex = Math.round(result.audits['speed-index'].numericValue);
            }
        }
        console.log('Final extracted metrics:', metrics);
        return metrics;
    }
    extractLighthouseSummary(result) {
        const summary = {
            score: 0,
            totalScore: 0,
            categoryCount: 0
        };
        let totalScore = 0;
        let categoryCount = 0;
        if (result.categories) {
            Object.keys(result.categories).forEach(category => {
                const score = result.categories[category]?.score;
                if (score !== undefined) {
                    totalScore += score;
                    categoryCount++;
                }
            });
        }
        if (categoryCount > 0) {
            summary.score = Math.round((totalScore / categoryCount) * 100);
            summary.totalScore = totalScore;
            summary.categoryCount = categoryCount;
        }
        return summary;
    }
    extractLighthouseDetails(result) {
        const details = {
            categories: {},
            audits: {},
            timing: {}
        };
        if (result.categories) {
            Object.keys(result.categories).forEach(category => {
                details.categories[category] = {
                    score: result.categories[category]?.score,
                    title: result.categories[category]?.title,
                    description: result.categories[category]?.description
                };
            });
        }
        if (result.audits) {
            Object.keys(result.audits).forEach(auditKey => {
                const audit = result.audits[auditKey];
                if (audit) {
                    details.audits[auditKey] = {
                        title: audit.title,
                        description: audit.description,
                        score: audit.score,
                        displayValue: audit.displayValue,
                        details: audit.details
                    };
                }
            });
        }
        if (result.timing) {
            details.timing = result.timing;
        }
        return details;
    }
    async saveLighthouseMetrics(testId, lighthouseResult) {
        try {
            const { TestMetricService } = await Promise.resolve().then(() => __importStar(require('./test-metric-service')));
            const testMetricService = new TestMetricService();
            const metricsToSave = [];
            if (lighthouseResult.categories) {
                if (lighthouseResult.categories.performance?.score) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'performance_score',
                        metric_name: 'Performance Score',
                        value: Math.round(lighthouseResult.categories.performance.score * 100),
                        unit: 'percent',
                        description: 'Lighthouse Performance Score'
                    });
                }
                if (lighthouseResult.categories.accessibility?.score) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'accessibility_score',
                        metric_name: 'Accessibility Score',
                        value: Math.round(lighthouseResult.categories.accessibility.score * 100),
                        unit: 'percent',
                        description: 'Lighthouse Accessibility Score'
                    });
                }
                if (lighthouseResult.categories['best-practices']?.score) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'best_practices_score',
                        metric_name: 'Best Practices Score',
                        value: Math.round(lighthouseResult.categories['best-practices'].score * 100),
                        unit: 'percent',
                        description: 'Lighthouse Best Practices Score'
                    });
                }
                if (lighthouseResult.categories.seo?.score) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'seo_score',
                        metric_name: 'SEO Score',
                        value: Math.round(lighthouseResult.categories.seo.score * 100),
                        unit: 'percent',
                        description: 'Lighthouse SEO Score'
                    });
                }
            }
            if (lighthouseResult.scores) {
                if (lighthouseResult.scores.performance?.score) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'performance_score',
                        metric_name: 'Performance Score',
                        value: Math.round(lighthouseResult.scores.performance.score * 100),
                        unit: 'percent',
                        description: 'Lighthouse Performance Score'
                    });
                }
                if (lighthouseResult.scores.accessibility?.score) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'accessibility_score',
                        metric_name: 'Accessibility Score',
                        value: Math.round(lighthouseResult.scores.accessibility.score * 100),
                        unit: 'percent',
                        description: 'Lighthouse Accessibility Score'
                    });
                }
                if (lighthouseResult.scores['best-practices']?.score) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'best_practices_score',
                        metric_name: 'Best Practices Score',
                        value: Math.round(lighthouseResult.scores['best-practices'].score * 100),
                        unit: 'percent',
                        description: 'Lighthouse Best Practices Score'
                    });
                }
                if (lighthouseResult.scores.seo?.score) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'seo_score',
                        metric_name: 'SEO Score',
                        value: Math.round(lighthouseResult.scores.seo.score * 100),
                        unit: 'percent',
                        description: 'Lighthouse SEO Score'
                    });
                }
            }
            if (lighthouseResult.metrics) {
                if (lighthouseResult.metrics['first-contentful-paint']?.value) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'performance_metric',
                        metric_name: 'First Contentful Paint',
                        value: Math.round(lighthouseResult.metrics['first-contentful-paint'].value),
                        unit: 'ms',
                        description: 'Time to first contentful paint'
                    });
                }
                if (lighthouseResult.metrics['largest-contentful-paint']?.value) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'performance_metric',
                        metric_name: 'Largest Contentful Paint',
                        value: Math.round(lighthouseResult.metrics['largest-contentful-paint'].value),
                        unit: 'ms',
                        description: 'Time to largest contentful paint'
                    });
                }
                if (lighthouseResult.metrics['total-blocking-time']?.value) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'performance_metric',
                        metric_name: 'Total Blocking Time',
                        value: Math.round(lighthouseResult.metrics['total-blocking-time'].value),
                        unit: 'ms',
                        description: 'Total time spent blocking the main thread'
                    });
                }
                if (lighthouseResult.metrics['cumulative-layout-shift']?.value) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'performance_metric',
                        metric_name: 'Cumulative Layout Shift',
                        value: lighthouseResult.metrics['cumulative-layout-shift'].value,
                        unit: 'score',
                        description: 'Cumulative layout shift score'
                    });
                }
                if (lighthouseResult.metrics['speed-index']?.value) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'performance_metric',
                        metric_name: 'Speed Index',
                        value: Math.round(lighthouseResult.metrics['speed-index'].value),
                        unit: 'ms',
                        description: 'Speed index measurement'
                    });
                }
                if (lighthouseResult.metrics['interactive']?.value) {
                    metricsToSave.push({
                        test_id: testId,
                        metric_type: 'performance_metric',
                        metric_name: 'Time to Interactive',
                        value: Math.round(lighthouseResult.metrics['interactive'].value),
                        unit: 'ms',
                        description: 'Time until the page becomes interactive'
                    });
                }
            }
            if (metricsToSave.length > 0) {
                await testMetricService.saveMetrics(metricsToSave);
            }
            console.log(`Saved ${metricsToSave.length} Lighthouse metrics to database`);
        }
        catch (error) {
            console.error('Failed to save Lighthouse metrics:', error);
            throw error;
        }
    }
    async saveLighthouseResult(id, testId, metrics, summary, details, rawData, config) {
        try {
            const { TestResultService } = await Promise.resolve().then(() => __importStar(require('./test-result-service')));
            const testResultService = new TestResultService();
            console.log('Saving Lighthouse result with metrics:', metrics);
            console.log('Raw data length:', rawData.length);
            const testResult = {
                id: id,
                testId: testId,
                testType: 'lighthouse',
                url: config.url || config.targetUrl || '',
                name: '',
                description: `Lighthouse performance audit for ${config.url || 'Unknown URL'}`,
                status: 'completed',
                currentStep: 'Lighthouse 테스트 완료',
                summary: summary,
                metrics: metrics,
                details: details,
                config: config || {},
                raw_data: rawData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await testResultService.saveResult(testResult);
            console.log('Lighthouse test result saved successfully');
        }
        catch (error) {
            console.error('Failed to save Lighthouse test result:', error);
            throw error;
        }
    }
    async cancelTest(testId) {
        const test = this.runningTests.get(testId);
        if (test) {
            this.runningTests.delete(testId);
            await this.handleTestCompletion(testId, 'cancelled');
        }
    }
    async handleTestCompletion(testId, status) {
        const test = this.runningTests.get(testId);
        if (test) {
            test.status = status;
            test.endTime = new Date();
            if (status === 'completed' || status === 'failed' || status === 'cancelled') {
                console.log(`Lighthouse test ${testId} completed with status: ${status}`);
            }
            this.runningTests.delete(testId);
            console.log(`Lighthouse test ${testId} completed with status: ${status}`);
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
}
exports.LighthouseService = LighthouseService;
//# sourceMappingURL=lighthouse-service.js.map