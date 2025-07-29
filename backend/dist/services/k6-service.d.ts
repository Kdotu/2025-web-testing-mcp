import { LoadTestConfig } from '../types';
export declare class K6Service {
    private runningTests;
    private testResults;
    executeTest(testId: string, config: LoadTestConfig): Promise<void>;
    cancelTest(testId: string): Promise<void>;
    private generateK6Script;
    private createK6ScriptContent;
    private parseK6Output;
    private updateTestMetrics;
    private handleTestCompletion;
    private cleanupTempFiles;
    getRunningTests(): string[];
    isTestRunning(testId: string): boolean;
}
//# sourceMappingURL=k6-service.d.ts.map