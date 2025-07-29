export interface LoadTestConfig {
    id?: string;
    url: string;
    name: string;
    description?: string;
    stages: LoadTestStage[];
    options?: {
        vus?: number;
        duration?: string;
        thresholds?: Record<string, string[]>;
    };
    createdAt?: string;
    updatedAt?: string;
}
export interface LoadTestStage {
    duration: string;
    target: number;
}
export interface LoadTestResult {
    id: string;
    testId: string;
    url: string;
    config: LoadTestConfig;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    metrics: {
        avgResponseTime: number;
        maxResponseTime: number;
        minResponseTime: number;
        requestsPerSecond: number;
        errorRate: number;
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
    };
    summary: {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        duration: number;
        startTime: string;
        endTime: string;
    };
    rawData?: any;
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
    status: LoadTestResult['status'];
    progress?: number;
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