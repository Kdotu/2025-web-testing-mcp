import { E2ETestConfig, E2ETestLocalResult } from '../types';
import { TestResultService } from './test-result-service';
export declare class E2ETestService {
    private testResultService;
    private runningTests;
    private tempDir;
    constructor(testResultService: TestResultService);
    executeE2ETest(config: E2ETestConfig, dbTestId?: string): Promise<E2ETestLocalResult>;
    private runPlaywrightViaMCP;
    private executePlaywrightViaMCP;
    private parsePlaywrightOutput;
    private handleTestCompletion;
    private updateTestResult;
    private cleanupTempFiles;
    getRunningTest(testId: string): E2ETestLocalResult | undefined;
    getAllRunningTests(): E2ETestLocalResult[];
    getE2ETestStatus(testId: string): Promise<E2ETestLocalResult | null>;
    cancelE2ETest(testId: string): Promise<void>;
}
//# sourceMappingURL=e2e-test-service.d.ts.map