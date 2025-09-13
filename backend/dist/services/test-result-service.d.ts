import { LoadTestResult } from '../types';
interface GetAllResultsOptions {
    page: number;
    limit: number;
    status?: string;
}
export declare class TestResultService {
    private supabaseClient;
    private serviceClient;
    constructor();
    private testConnection;
    private parseResultFromRow;
    private calculateDuration;
    createInitialResult(data: {
        testType: string;
        url: string;
        name: string;
        description?: string;
        status: string;
        config?: any;
    }): Promise<any>;
    private generateTestId;
    saveResult(result: LoadTestResult): Promise<void>;
    updateResult(result: LoadTestResult): Promise<void>;
    getResultById(id: string): Promise<LoadTestResult | null>;
    getResultByTestId(testId: string): Promise<LoadTestResult | null>;
    getAllResults(options: GetAllResultsOptions): Promise<{
        results: LoadTestResult[];
        total: number;
    }>;
    getTotalCount(): Promise<number>;
    testDatabaseConnection(): Promise<{
        connected: boolean;
        responseTime: number | null;
        lastError: string | null;
    }>;
    deleteResult(id: string): Promise<void>;
    getRunningTests(): Promise<LoadTestResult[]>;
    getStatistics(): Promise<{
        totalTests: number;
        completedTests: number;
        failedTests: number;
        averageResponseTime: number;
        averageErrorRate: number;
    }>;
}
export {};
//# sourceMappingURL=test-result-service.d.ts.map