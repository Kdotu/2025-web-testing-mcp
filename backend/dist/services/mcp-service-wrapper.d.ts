import { LoadTestConfig, E2ETestConfig } from '../types';
export interface MCPTestResult {
    success: boolean;
    data?: any;
    error?: string;
    output?: string;
    logs?: string[];
    metrics?: any;
}
export declare class MCPServiceWrapper {
    private k6Client;
    private lighthouseClient;
    private playwrightClient;
    constructor();
    private initializePlaywrightClient;
    executeK6Test(config: LoadTestConfig): Promise<MCPTestResult>;
    executeLighthouseTest(config: any): Promise<MCPTestResult>;
    executePlaywrightTest(config: E2ETestConfig): Promise<MCPTestResult>;
    executePlaywrightScenario(scenarioCode: string, config?: any): Promise<MCPTestResult>;
    checkConnections(): Promise<{
        k6: boolean;
        lighthouse: boolean;
        playwright: boolean;
    }>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=mcp-service-wrapper.d.ts.map