"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestMetricService = void 0;
const supabase_client_1 = require("./supabase-client");
class TestMetricService {
    constructor() {
        try {
            this.supabase = (0, supabase_client_1.createServiceClient)();
            console.log('TestMetricService: Supabase client created successfully using createServiceClient');
        }
        catch (error) {
            console.error('TestMetricService: Failed to create Supabase client:', error);
            this.supabase = null;
        }
    }
    async getMetricsByTestId(testId) {
        try {
            console.log('TestMetricService: Fetching metrics for testId:', testId);
            if (!this.supabase) {
                console.log('TestMetricService: Using mock data');
                return this.getMockMetrics(testId);
            }
            const { data, error } = await this.supabase
                .from('m2_test_metrics')
                .select('*')
                .eq('test_id', testId)
                .order('metric_type', { ascending: true })
                .order('metric_name', { ascending: true });
            if (error) {
                console.error('Error fetching metrics:', error);
                throw error;
            }
            console.log('TestMetricService: Found metrics:', data?.length || 0);
            console.log('TestMetricService: Metrics data:', data);
            return data || [];
        }
        catch (error) {
            console.error('Failed to get metrics by test ID:', error);
            return this.getMockMetrics(testId);
        }
    }
    async getMetricsGroupedByType(testId) {
        try {
            const metrics = await this.getMetricsByTestId(testId);
            const grouped = {};
            metrics.forEach(metric => {
                if (!grouped[metric.metric_type]) {
                    grouped[metric.metric_type] = [];
                }
                grouped[metric.metric_type].push(metric);
            });
            return grouped;
        }
        catch (error) {
            console.error('Failed to get grouped metrics:', error);
            throw error;
        }
    }
    async getMetricsByType(testId, metricType) {
        try {
            const { data, error } = await this.supabase
                .from('m2_test_metrics')
                .select('*')
                .eq('test_id', testId)
                .eq('metric_type', metricType)
                .order('metric_name', { ascending: true });
            if (error) {
                console.error('Error fetching metrics by type:', error);
                throw error;
            }
            return data || [];
        }
        catch (error) {
            console.error('Failed to get metrics by type:', error);
            throw error;
        }
    }
    async getMetric(testId, metricType, metricName) {
        try {
            const { data, error } = await this.supabase
                .from('m2_test_metrics')
                .select('*')
                .eq('test_id', testId)
                .eq('metric_type', metricType)
                .eq('metric_name', metricName)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error('Error fetching metric:', error);
                throw error;
            }
            return data;
        }
        catch (error) {
            console.error('Failed to get metric:', error);
            throw error;
        }
    }
    async saveMetrics(metrics) {
        try {
            if (!this.supabase) {
                console.log('TestMetricService: Supabase not available, skipping metrics save');
                return;
            }
            const { error } = await this.supabase
                .from('m2_test_metrics')
                .insert(metrics);
            if (error) {
                console.error('Error saving metrics:', error);
                if (process.env['NODE_ENV'] === 'production') {
                    console.warn('TestMetricService: Continuing without saving detailed metrics');
                    return;
                }
                throw error;
            }
            console.log(`Saved ${metrics.length} metrics to database`);
        }
        catch (error) {
            console.error('Failed to save metrics:', error);
            if (process.env['NODE_ENV'] === 'production') {
                console.warn('TestMetricService: Continuing without saving detailed metrics due to error');
                return;
            }
            throw error;
        }
    }
    async updateMetric(id, updates) {
        try {
            const { error } = await this.supabase
                .from('m2_test_metrics')
                .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
                .eq('id', id);
            if (error) {
                console.error('Error updating metric:', error);
                throw error;
            }
        }
        catch (error) {
            console.error('Failed to update metric:', error);
            throw error;
        }
    }
    async deleteMetricsByTestId(testId) {
        try {
            const { error } = await this.supabase
                .from('m2_test_metrics')
                .delete()
                .eq('test_id', testId);
            if (error) {
                console.error('Error deleting metrics:', error);
                throw error;
            }
            console.log(`Deleted all metrics for test: ${testId}`);
        }
        catch (error) {
            console.error('Failed to delete metrics:', error);
            throw error;
        }
    }
    async getMetricStats(testId, metricType, metricName) {
        try {
            const { data, error } = await this.supabase
                .from('m2_test_metrics')
                .select('value')
                .eq('test_id', testId)
                .eq('metric_type', metricType)
                .eq('metric_name', metricName);
            if (error) {
                console.error('Error fetching metric stats:', error);
                throw error;
            }
            if (!data || data.length === 0) {
                return null;
            }
            const values = data.map((row) => row.value).filter((val) => val !== null);
            if (values.length === 0) {
                return null;
            }
            return {
                count: values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((sum, val) => sum + val, 0) / values.length
            };
        }
        catch (error) {
            console.error('Failed to get metric stats:', error);
            throw error;
        }
    }
    getMockMetrics(testId) {
        const now = new Date().toISOString();
        return [
            {
                id: `mock-${testId}-1`,
                test_id: testId,
                metric_type: 'performance',
                metric_name: 'response_time',
                value: 1200,
                unit: 'ms',
                description: '평균 응답 시간',
                created_at: now,
                updated_at: now
            },
            {
                id: `mock-${testId}-2`,
                test_id: testId,
                metric_type: 'performance',
                metric_name: 'throughput',
                value: 150,
                unit: 'req/s',
                description: '초당 요청 처리량',
                created_at: now,
                updated_at: now
            },
            {
                id: `mock-${testId}-3`,
                test_id: testId,
                metric_type: 'load',
                metric_name: 'virtual_users',
                value: 10,
                unit: 'users',
                description: '가상 사용자 수',
                created_at: now,
                updated_at: now
            },
            {
                id: `mock-${testId}-4`,
                test_id: testId,
                metric_type: 'load',
                metric_name: 'error_rate',
                value: 0.5,
                unit: '%',
                description: '오류율',
                created_at: now,
                updated_at: now
            }
        ];
    }
}
exports.TestMetricService = TestMetricService;
//# sourceMappingURL=test-metric-service.js.map