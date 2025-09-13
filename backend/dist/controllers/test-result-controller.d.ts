import { LoadTestResult } from '../types';
interface GetAllResultsOptions {
    page: number;
    limit: number;
    status?: string;
}
export declare class TestResultController {
    private testResultService;
    constructor();
    getAllResults(options: GetAllResultsOptions): Promise<{
        results: LoadTestResult[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getResultById(id: string): Promise<LoadTestResult>;
    deleteResult(id: string): Promise<void>;
    getTotalCount(): Promise<{
        total: number;
    }>;
    getStatistics(): Promise<{
        totalTests: number;
        completedTests: number;
        failedTests: number;
        averageResponseTime: number;
        averageErrorRate: number;
    }>;
}
export {};
//# sourceMappingURL=test-result-controller.d.ts.map