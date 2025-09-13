import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
interface MCPProcessInfo {
    id: string;
    name: string;
    process: ChildProcess;
    startTime: Date;
    lastActivity: Date;
    isHealthy: boolean;
    restartCount: number;
    maxRestarts: number;
    command: string;
    args: string[];
    cwd: string;
    env?: NodeJS.ProcessEnv | undefined;
}
interface MCPServerConfig {
    name: string;
    command: string;
    args: string[];
    cwd: string;
    env?: NodeJS.ProcessEnv | undefined;
    healthCheckInterval?: number;
    maxRestarts?: number;
    timeout?: number;
}
export declare class MCPProcessManager extends EventEmitter {
    private processes;
    private healthCheckTimers;
    private readonly DEFAULT_HEALTH_CHECK_INTERVAL;
    private readonly DEFAULT_MAX_RESTARTS;
    private readonly DEFAULT_TIMEOUT;
    constructor();
    startServer(config: MCPServerConfig): Promise<string>;
    stopServer(processId: string): Promise<boolean>;
    stopAllServers(): Promise<void>;
    restartServer(processId: string): Promise<string>;
    getServerStatus(processId: string): MCPProcessInfo | null;
    getAllServerStatuses(): MCPProcessInfo[];
    isServerRunning(serverName: string): boolean;
    getRunningServerId(serverName: string): string | null;
    private setupProcessEventListeners;
    private handleProcessExit;
    private handleProcessError;
    private startHealthCheck;
    private stopHealthCheck;
    private performHealthCheck;
    private gracefullyKillProcess;
    private waitForProcessStart;
    private setupProcessCleanup;
    executeCommand(processId: string, method: string, params: any): Promise<any>;
    private parseK6Metrics;
    getResourceUsage(): {
        totalProcesses: number;
        healthyProcesses: number;
        memoryUsage: number;
    };
}
export {};
//# sourceMappingURL=mcp-process-manager.d.ts.map