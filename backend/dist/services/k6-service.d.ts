import { LoadTestConfig } from '../types';
export declare class K6Service {
    private runningTests;
    private testResults;
    private timeoutTimers;
    private readonly TIMEOUT_DURATION;
    private mcpWrapper;
    constructor();
    executeTest(testId: string, config: LoadTestConfig): Promise<void>;
    executeTestViaMCP(testId: string, config: LoadTestConfig): Promise<void>;
    private executeK6Direct;
    cancelTest(testId: string): Promise<void>;
    private generateK6Script;
    private createK6ScriptContent;
    private parseK6Output;
    private extractMetrics;
    private extractSummary;
    private extractDetailedMetrics;
    private parseThresholdResults;
    private saveDetailedMetrics;
    private convertMetricsToRecords;
    private parseK6Progress;
    private updateTestProgress;
    private extractRawData;
    private saveTestResult;
    private setTestTimeout;
    private clearTestTimeout;
    private handleTestCompletion;
    private cleanupTempFiles;
    getRunningTests(): string[];
    isTestRunning(testId: string): boolean;
    getTestResult(testId: string): any;
    testTimeout(testId: string, timeoutMs?: number): Promise<void>;
}
//# sourceMappingURL=k6-service.d.ts.map