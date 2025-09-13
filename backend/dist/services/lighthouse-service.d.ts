import { LoadTestConfig } from '../types';
export declare class LighthouseService {
    private runningTests;
    private testResults;
    constructor();
    executeTest(id: string, testId: string, config: LoadTestConfig): Promise<void>;
    private executeLighthouseViaMCP;
    private parseLighthouseOutput;
    private extractLighthouseMetrics;
    private extractLighthouseSummary;
    private extractLighthouseDetails;
    private saveLighthouseMetrics;
    private saveLighthouseResult;
    cancelTest(testId: string): Promise<void>;
    private handleTestCompletion;
    getRunningTests(): string[];
    isTestRunning(testId: string): boolean;
    getTestResult(testId: string): any;
}
//# sourceMappingURL=lighthouse-service.d.ts.map