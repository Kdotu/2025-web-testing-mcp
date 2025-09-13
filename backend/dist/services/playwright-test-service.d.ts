export interface PlaywrightTestConfig {
    browser?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    viewport?: {
        width: number;
        height: number;
    };
    timeout?: number;
    userAgent?: string;
}
export interface PlaywrightTestExecution {
    executionId: string;
    scenarioCode: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    config: PlaywrightTestConfig;
    userId?: string;
}
export interface PlaywrightTestResult {
    executionId: string;
    success: boolean;
    logs: string[];
    output?: string;
    error?: string;
    executionTime: string;
    screenshots?: string[];
    videos?: string[];
    data?: any;
}
export declare class PlaywrightTestService {
    private mcpWrapper;
    private supabase;
    constructor();
    createTestExecution(scenarioCode: string, config: PlaywrightTestConfig, userId?: string, descriptionFromClient?: string): Promise<string>;
    executeTestScenario(executionId: string, scenarioCode: string, config: PlaywrightTestConfig): Promise<PlaywrightTestResult>;
    monitorTestExecution(executionId: string): Promise<void>;
    completeTestExecution(executionId: string, result: PlaywrightTestResult): Promise<void>;
    executeTestScenarioFlow(scenarioCode: string, config: PlaywrightTestConfig, userId?: string, descriptionFromClient?: string): Promise<string>;
    getTestExecutionStatus(executionId: string): Promise<any>;
    getTestExecutionResult(executionId: string): Promise<any>;
    private updateTestStatus;
    private generateTestDescription;
    private getPlaywrightTestTypeId;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=playwright-test-service.d.ts.map