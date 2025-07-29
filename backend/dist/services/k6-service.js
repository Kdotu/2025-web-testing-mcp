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
class K6Service {
    constructor() {
        this.runningTests = new Map();
        this.testResults = new Map();
    }
    async executeTest(testId, config) {
        try {
            const scriptPath = await this.generateK6Script(testId, config);
            const result = await this.executeK6ViaMCP(scriptPath, config);
            this.parseK6Output(testId, result);
            this.handleTestCompletion(testId, 'completed');
        }
        catch (error) {
            console.error('Failed to execute k6 test via MCP:', error);
            this.handleTestCompletion(testId, 'failed');
            throw error;
        }
    }
    async executeK6ViaMCP(scriptPath, config) {
        return new Promise((resolve, reject) => {
            const k6ServerPath = (0, path_1.join)(process.cwd(), '..', 'k6-mcp-server');
            const isWindows = process.platform === 'win32';
            const pythonPath = isWindows
                ? (0, path_1.join)(k6ServerPath, '.venv', 'Scripts', 'python.exe')
                : 'python';
            const pythonProcess = (0, child_process_1.spawn)(pythonPath, ['k6_server.py'], {
                cwd: k6ServerPath,
                env: {
                    ...process.env,
                    K6_BIN: 'k6'
                }
            });
            let output = '';
            let errorOutput = '';
            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                }
                else {
                    reject(new Error(`MCP server failed: ${errorOutput}`));
                }
            });
            const testRequest = {
                method: 'execute_k6_test',
                params: {
                    script_file: scriptPath,
                    duration: config.duration || '30s',
                    vus: config.vus || 10
                }
            };
            pythonProcess.stdin.write(JSON.stringify(testRequest) + '\n');
            pythonProcess.stdin.end();
        });
    }
    async cancelTest(testId) {
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
        return scriptPath;
    }
    createK6ScriptContent(config) {
        const stages = config.stages.map(stage => `{ duration: '${stage.duration}', target: ${stage.target} }`).join(',\n    ');
        return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    ${stages}
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.1']
  }
};

export default function () {
  const response = http.get('${config.url}');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(response.status !== 200);
  sleep(1);
}
`;
    }
    parseK6Output(testId, output) {
        const metrics = this.extractMetrics(output);
        this.updateTestMetrics(testId, metrics);
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
            }
        }
        return metrics;
    }
    updateTestMetrics(testId, metrics) {
        const existingResult = this.testResults.get(testId);
        if (existingResult) {
            existingResult.metrics = { ...existingResult.metrics, ...metrics };
            this.testResults.set(testId, existingResult);
        }
    }
    handleTestCompletion(testId, status) {
        const result = this.testResults.get(testId);
        if (result) {
            result.status = status;
            result.completedAt = new Date().toISOString();
            this.testResults.set(testId, result);
        }
        this.cleanupTempFiles(testId);
    }
    async cleanupTempFiles(testId) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const tempDir = path.join(process.cwd(), 'temp');
            const scriptPath = path.join(tempDir, `${testId}.js`);
            if (fs.existsSync(scriptPath)) {
                fs.unlinkSync(scriptPath);
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
}
exports.K6Service = K6Service;
//# sourceMappingURL=k6-service.js.map