import { LoadTestConfig, LoadTestResult, TestStatusUpdate } from '../types';
export declare class LoadTestController {
    private k6Service;
    private testResultService;
    constructor();
    createTest(config: LoadTestConfig): Promise<LoadTestResult>;
    getTestStatus(testId: string): Promise<TestStatusUpdate>;
    getTestResults(testId: string): Promise<LoadTestResult>;
    cancelTest(testId: string): Promise<void>;
    private updateTestStatus;
    updateTestResult(testId: string, result: Partial<LoadTestResult>): Promise<void>;
}
//# sourceMappingURL=load-test-controller.d.ts.map