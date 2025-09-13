import { MCPProcessManager } from '../services/mcp-process-manager';
interface MCPClient {
    callTool(method: string, params: any): Promise<any>;
    initialize(): Promise<void>;
    close(): Promise<void>;
}
export declare class MCPClientFactory {
    private static processManager;
    static getProcessManager(): MCPProcessManager;
    static createExternalK6Client(): MCPClient;
    static createLocalK6Client(): MCPClient;
    static createK6Client(): MCPClient;
    static createExternalLighthouseClient(): MCPClient;
    static createLocalLighthouseClient(): MCPClient;
    static createLighthouseClient(): MCPClient;
    static createExternalPlaywrightClient(): MCPClient;
    static createLocalPlaywrightClient(): MCPClient;
    static createPlaywrightClient(): MCPClient;
    static createAllClients(): {
        k6: MCPClient;
        lighthouse: MCPClient;
        playwright: MCPClient;
    };
    static checkExternalServers(): Promise<{
        k6: boolean;
        lighthouse: boolean;
        playwright: boolean;
    }>;
}
export {};
//# sourceMappingURL=mcp-client-factory.d.ts.map