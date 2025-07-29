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
const child_process_1 = require("child_process");
const path_1 = require("path");
class K6Service {
    constructor() {
        this.runningTests = new Map();
        this.testResults = new Map();
    }
    async executeTest(testId, config) {
        try {
            const scriptPath = await this.generateK6Script(testId, config);
            const k6Options = [
                'run',
                '--out', 'json=results.json',
                '--no-usage-report',
                scriptPath
            ];
            const k6Process = (0, child_process_1.spawn)('k6', k6Options, {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            this.runningTests.set(testId, k6Process);
            let output = '';
            k6Process.stdout?.on('data', (data) => {
                output += data.toString();
                this.parseK6Output(testId, data.toString());
            });
            k6Process.stderr?.on('data', (data) => {
                console.error(`k6 error for test ${testId}:`, data.toString());
            });
            k6Process.on('close', (code) => {
                this.runningTests.delete(testId);
                if (code === 0) {
                    this.handleTestCompletion(testId, 'completed');
                }
                else {
                    this.handleTestCompletion(testId, 'failed');
                }
            });
            k6Process.on('error', (error) => {
                console.error(`k6 process error for test ${testId}:`, error);
                this.runningTests.delete(testId);
                this.handleTestCompletion(testId, 'failed');
            });
        }
        catch (error) {
            console.error('Failed to execute k6 test:', error);
            this.handleTestCompletion(testId, 'failed');
            throw error;
        }
    }
    async cancelTest(testId) {
        const process = this.runningTests.get(testId);
        if (process) {
            process.kill('SIGTERM');
            this.runningTests.delete(testId);
            this.handleTestCompletion(testId, 'cancelled');
        }
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
    errors: ['rate<0.1'],
  },
};

export default function() {
  const response = http.get('${config.url}');
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  sleep(1);
}
`;
    }
    parseK6Output(testId, output) {
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('http_req_duration')) {
                const match = line.match(/avg=(\d+\.?\d*)/);
                if (match && match[1]) {
                    const avgResponseTime = parseFloat(match[1]);
                    this.updateTestMetrics(testId, { avgResponseTime });
                }
            }
        }
    }
    updateTestMetrics(testId, metrics) {
        const currentMetrics = this.testResults.get(testId) || {};
        this.testResults.set(testId, { ...currentMetrics, ...metrics });
    }
    handleTestCompletion(testId, status) {
        console.log(`Test ${testId} ${status}`);
        this.testResults.delete(testId);
        this.cleanupTempFiles(testId);
    }
    async cleanupTempFiles(testId) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const tempDir = path.join(process.cwd(), 'temp');
            const scriptPath = path.join(tempDir, `${testId}.js`);
            const resultsPath = path.join(tempDir, 'results.json');
            if (fs.existsSync(scriptPath)) {
                fs.unlinkSync(scriptPath);
            }
            if (fs.existsSync(resultsPath)) {
                fs.unlinkSync(resultsPath);
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
}
exports.K6Service = K6Service;
//# sourceMappingURL=k6-service.js.map