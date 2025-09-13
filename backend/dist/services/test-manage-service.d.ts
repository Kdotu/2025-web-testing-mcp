export declare class TestManageService {
    private testResultService;
    constructor();
    getTestStatus(testId: string): Promise<any>;
    cancelTest(testId: string): Promise<void>;
    updateTestStatus(testId: string, status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'stopped', currentStep?: string, message?: string): Promise<void>;
    getRunningTests(): Promise<any[]>;
    deleteTestResult(testId: string): Promise<void>;
}
//# sourceMappingURL=test-manage-service.d.ts.map