export interface LoadTestConfig {
    id?: string;
    url: string;
    name?: string;
    description?: string;
    stages?: LoadTestStage[];
    testType?: string;
    device?: string;
    categories?: string[];
    scriptPath?: string;
    duration?: string;
    vus?: number;
    createdAt?: string;
    updatedAt?: string;
}
export interface LoadTestStage {
    target: number;
    duration: string;
    description?: string;
}
export interface LoadTestResult {
    id: string;
    testId: string;
    testType?: string;
    url: string;
    name?: string;
    description?: string;
    config?: any;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'stopped';
    currentStep?: string;
    metrics: {
        http_req_duration: {
            avg: number;
            min: number;
            max: number;
            p95: number;
        };
        http_req_rate: number;
        http_req_failed: number;
        vus: number;
        vus_max: number;
    };
    summary: {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        duration: number;
        startTime: string;
        endTime: string;
    };
    details?: any;
    raw_data?: string;
    createdAt: string;
    updatedAt: string;
    rowNumber?: number;
    startTime?: string;
    endTime?: string;
    duration?: string | undefined;
}
export interface E2ETestConfig {
    url: string;
    name: string;
    description?: string;
    config: {
        testType: string;
        settings: any;
    };
}
export interface E2ETestLocalResult {
    id: string;
    url: string;
    name: string;
    description?: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled' | 'stopped';
    startTime: string;
    endTime?: string;
    logs: string[];
    results?: any;
    error?: string;
}
export interface E2ETestResult {
    id: string;
    testId: string;
    testType: 'playwright';
    url: string;
    name: string;
    description?: string;
    config?: any;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    currentStep?: string;
    metrics: {
        totalSteps: number;
        completedSteps: number;
        failedSteps: number;
        successRate: number;
    };
    summary: {
        totalSteps: number;
        completedSteps: number;
        failedSteps: number;
        duration: number;
        startTime: string;
        endTime?: string;
    };
    details?: any;
    raw_data?: string;
    createdAt: string;
    updatedAt: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: string;
}
export interface TestStatusUpdate {
    testId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'stopped' | 'not_found';
    progress?: number;
    currentStep?: string;
    message?: string;
    timestamp: string;
}
export interface MCPServerConfig {
    url: string;
    timeout: number;
    retryAttempts: number;
}
export declare enum ErrorType {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    MCP_CONNECTION_ERROR = "MCP_CONNECTION_ERROR",
    TEST_EXECUTION_ERROR = "TEST_EXECUTION_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    NOT_FOUND = "NOT_FOUND",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
export interface AppError {
    type: ErrorType;
    message: string;
    details?: any;
    timestamp: string;
}
//# sourceMappingURL=index.d.ts.map