import { LoadTestConfig } from '../types';
export declare class K6Service {
    private runningTests;
    private testResults;
    constructor();
    executeTest(testId: string, config: LoadTestConfig): Promise<void>;
    private executeK6ViaMCP;
    cancelTest(testId: string): Promise<void>;
    private generateK6Script;
    private createK6ScriptContent;
    private parseK6Output;
    private extractMetrics;
    private updateTestMetrics;
    private handleTestCompletion;
    private cleanupTempFiles;
    getRunningTests(): string[];
    isTestRunning(testId: string): boolean;
    getTestResult(testId: string): any;
}
//# sourceMappingURL=k6-service.d.ts.map