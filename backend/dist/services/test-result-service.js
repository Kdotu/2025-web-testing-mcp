"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestResultService = void 0;
const supabase_client_1 = require("./supabase-client");
class TestResultService {
    constructor() {
        this.supabaseClient = supabase_client_1.supabase;
        this.serviceClient = (0, supabase_client_1.createServiceClient)();
        this.testConnection();
    }
    async testConnection() {
        try {
            const { error } = await this.supabaseClient
                .from('m2_test_results')
                .select('count')
                .limit(1);
            if (error) {
                console.error('Supabase connection failed:', error);
                throw new Error('Failed to connect to Supabase');
            }
            console.log('✅ Supabase connection established');
        }
        catch (error) {
            console.error('Supabase connection test failed:', error);
            throw error;
        }
    }
    async saveResult(result) {
        const { error } = await this.serviceClient
            .from('m2_test_results')
            .insert({
            id: result.id,
            test_id: result.testId,
            url: result.url,
            config: result.config,
            status: result.status,
            metrics: result.metrics,
            summary: result.summary,
            raw_data: result.rawData,
            created_at: result.createdAt,
            updated_at: result.updatedAt
        });
        if (error) {
            console.error('Failed to save test result:', error);
            throw new Error('Failed to save test result');
        }
    }
    async updateResult(result) {
        const { error } = await this.serviceClient
            .from('m2_test_results')
            .update({
            status: result.status,
            metrics: result.metrics,
            summary: result.summary,
            raw_data: result.rawData,
            updated_at: result.updatedAt
        })
            .eq('id', result.id);
        if (error) {
            console.error('Failed to update test result:', error);
            throw new Error('Failed to update test result');
        }
    }
    async getResultById(id) {
        const { data, error } = await this.supabaseClient
            .from('m2_test_results')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            console.error('Failed to get test result:', error);
            throw new Error('Failed to get test result');
        }
        return this.parseResultFromRow(data);
    }
    async getResultByTestId(testId) {
        const { data, error } = await this.supabaseClient
            .from('m2_test_results')
            .select('*')
            .eq('test_id', testId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            console.error('Failed to get test result:', error);
            throw new Error('Failed to get test result');
        }
        return this.parseResultFromRow(data);
    }
    async getAllResults(options) {
        const { page, limit, status } = options;
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        let query = this.supabaseClient
            .from('m2_test_results')
            .select('*', { count: 'exact' });
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);
        if (error) {
            console.error('Failed to get test results:', error);
            throw new Error('Failed to get test results');
        }
        const results = data?.map(row => this.parseResultFromRow(row)) || [];
        return {
            results,
            total: count || 0
        };
    }
    async deleteResult(id) {
        const { error } = await this.serviceClient
            .from('m2_test_results')
            .delete()
            .eq('id', id);
        if (error) {
            console.error('Failed to delete test result:', error);
            throw new Error('Failed to delete test result');
        }
    }
    async getStatistics() {
        const { count: totalTests } = await this.supabaseClient
            .from('m2_test_results')
            .select('*', { count: 'exact', head: true });
        const { count: completedTests } = await this.supabaseClient
            .from('m2_test_results')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed');
        const { count: failedTests } = await this.supabaseClient
            .from('m2_test_results')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'failed');
        const { data: metricsData } = await this.supabaseClient
            .from('m2_test_results')
            .select('metrics')
            .not('metrics', 'is', null);
        let totalResponseTime = 0;
        let totalErrorRate = 0;
        let validMetricsCount = 0;
        metricsData?.forEach((row) => {
            if (row.metrics?.avgResponseTime) {
                totalResponseTime += row.metrics.avgResponseTime;
                totalErrorRate += row.metrics.errorRate || 0;
                validMetricsCount++;
            }
        });
        const averageResponseTime = validMetricsCount > 0 ? totalResponseTime / validMetricsCount : 0;
        const averageErrorRate = validMetricsCount > 0 ? totalErrorRate / validMetricsCount : 0;
        return {
            totalTests: totalTests || 0,
            completedTests: completedTests || 0,
            failedTests: failedTests || 0,
            averageResponseTime,
            averageErrorRate
        };
    }
    parseResultFromRow(row) {
        return {
            id: row.id,
            testId: row.test_id,
            url: row.url,
            config: row.config,
            status: row.status,
            metrics: row.metrics,
            summary: row.summary,
            rawData: row.raw_data,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
exports.TestResultService = TestResultService;
//# sourceMappingURL=test-result-service.js.map