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
    saveResult(result: LoadTestResult): Promise<void>;
    updateResult(result: LoadTestResult): Promise<void>;
    getResultById(id: string): Promise<LoadTestResult | null>;
    getResultByTestId(testId: string): Promise<LoadTestResult | null>;
    getAllResults(options: GetAllResultsOptions): Promise<{
        results: LoadTestResult[];
        total: number;
    }>;
    deleteResult(id: string): Promise<void>;
    getStatistics(): Promise<{
        totalTests: number;
        completedTests: number;
        failedTests: number;
        averageResponseTime: number;
        averageErrorRate: number;
    }>;
    private parseResultFromRow;
}
export {};
//# sourceMappingURL=test-result-service.d.ts.map