export interface TestMetric {
    id: string;
    test_id: string;
    metric_type: string;
    metric_name: string;
    value: number;
    unit: string;
    description: string;
    created_at: string;
    updated_at: string;
}
export interface MetricGroup {
    [metricType: string]: TestMetric[];
}
export declare class TestMetricService {
    private supabase;
    constructor();
    getMetricsByTestId(testId: string): Promise<TestMetric[]>;
    getMetricsGroupedByType(testId: string): Promise<{
        [metricType: string]: TestMetric[];
    }>;
    getMetricsByType(testId: string, metricType: string): Promise<TestMetric[]>;
    getMetric(testId: string, metricType: string, metricName: string): Promise<TestMetric | null>;
    saveMetrics(metrics: Partial<TestMetric>[]): Promise<void>;
    updateMetric(id: string, updates: Partial<TestMetric>): Promise<void>;
    deleteMetricsByTestId(testId: string): Promise<void>;
    getMetricStats(testId: string, metricType: string, metricName: string): Promise<any>;
    private getMockMetrics;
}
//# sourceMappingURL=test-metric-service.d.ts.map