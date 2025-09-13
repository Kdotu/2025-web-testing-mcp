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
        const maxRetries = 3;
        const retryDelay = 2000;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Supabase connection attempt ${attempt}/${maxRetries}`);
                const { error } = await this.supabaseClient
                    .from('m2_test_results')
                    .select('count')
                    .limit(1);
                if (error) {
                    console.error(`Supabase connection failed (attempt ${attempt}):`, error);
                    if (attempt === maxRetries) {
                        throw new Error('Failed to connect to Supabase after multiple attempts');
                    }
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }
                console.log('✅ Supabase connection established');
                return;
            }
            catch (error) {
                console.error(`Supabase connection test failed (attempt ${attempt}):`, error);
                if (attempt === maxRetries) {
                    console.error('All connection attempts failed');
                    if (process.env['NODE_ENV'] === 'production') {
                        console.warn('⚠️ Continuing without Supabase connection in production');
                        return;
                    }
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
    parseResultFromRow(row) {
        return {
            id: row.id,
            testId: row.test_id,
            testType: row.test_type,
            url: row.url,
            name: row.name,
            description: row.description,
            status: row.status,
            currentStep: row.current_step,
            metrics: row.metrics || {},
            summary: row.summary || {},
            details: row.details || {},
            config: row.config || {},
            raw_data: row.raw_data,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            startTime: row.created_at,
            endTime: row.status === 'completed' || row.status === 'failed' ? row.updated_at : undefined,
            duration: row.status === 'completed' || row.status === 'failed' ?
                this.calculateDuration(row.created_at, row.updated_at) : undefined
        };
    }
    calculateDuration(startTime, endTime) {
        try {
            const start = new Date(startTime);
            const end = new Date(endTime);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return '00:00';
            }
            const elapsedTime = end.getTime() - start.getTime();
            if (elapsedTime < 0) {
                return '00:00';
            }
            const elapsedSeconds = Math.floor(elapsedTime / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        catch (error) {
            console.error('Error calculating duration:', error);
            return '00:00';
        }
    }
    async createInitialResult(data) {
        try {
            const testId = this.generateTestId(data.testType);
            const now = new Date().toISOString();
            const initialResult = {
                test_id: testId,
                test_type: data.testType,
                url: data.url,
                name: data.name,
                description: data.description || '',
                status: data.status,
                current_step: '테스트 초기화',
                metrics: {},
                summary: {},
                details: {},
                config: data.config || {},
                raw_data: '',
                created_at: now,
                updated_at: now
            };
            console.log('📋 TestResultService - 저장할 config 데이터:', JSON.stringify(data.config, null, 2));
            console.log('📋 TestResultService - 전체 initialResult:', JSON.stringify(initialResult, null, 2));
            console.log('Creating initial test result:', initialResult);
            const { data: result, error } = await this.supabaseClient
                .from('m2_test_results')
                .insert(initialResult)
                .select()
                .single();
            if (error) {
                console.error('Failed to create initial test result:', error);
                throw error;
            }
            console.log('✅ Initial test result created successfully:', result);
            return result;
        }
        catch (error) {
            console.error('초기 테스트 결과 생성 실패:', error);
            throw error;
        }
    }
    generateTestId(testType) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        if (testType) {
            return `${testType}_${timestamp}_${random}`;
        }
        return `${timestamp}_${random}`;
    }
    async saveResult(result) {
        const { error } = await this.supabaseClient
            .from('m2_test_results')
            .insert([{
                test_id: result.testId,
                name: result.name,
                description: result.description,
                url: result.url,
                status: result.status,
                test_type: result.testType,
                current_step: result.currentStep,
                summary: result.summary,
                metrics: result.metrics,
                details: result.details,
                config: result.config,
                raw_data: result.raw_data
            }]);
        if (error) {
            console.error('Failed to save test result:', error);
            throw error;
        }
    }
    async updateResult(result) {
        console.log('updateResult called with testId:', result.testId);
        console.log('raw_data length:', result.raw_data?.length || 0);
        console.log('Update data:', {
            testId: result.testId,
            status: result.status,
            currentStep: result.currentStep,
            updatedAt: result.updatedAt,
            hasMetrics: !!result.metrics,
            hasSummary: !!result.summary,
            hasDetails: !!result.details,
            hasConfig: !!result.config
        });
        const updateData = {
            name: result.name,
            description: result.description,
            url: result.url,
            status: result.status,
            test_type: result.testType,
            current_step: result.currentStep,
            summary: result.summary,
            metrics: result.metrics,
            details: result.details,
            config: result.config,
            raw_data: result.raw_data,
            updated_at: new Date().toISOString()
        };
        console.log('Supabase update query data:', updateData);
        const { error } = await this.supabaseClient
            .from('m2_test_results')
            .update(updateData)
            .eq('test_id', result.testId);
        if (error) {
            console.error('Failed to update test result:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            throw error;
        }
        else {
            console.log('Test result updated successfully in DB');
        }
    }
    async getResultById(id) {
        try {
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
                return null;
            }
            return this.parseResultFromRow(data);
        }
        catch (error) {
            console.error('Error in getResultById:', error);
            return null;
        }
    }
    async getResultByTestId(testId) {
        try {
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
                return null;
            }
            return this.parseResultFromRow(data);
        }
        catch (error) {
            console.error('Error in getResultByTestId:', error);
            return null;
        }
    }
    async getAllResults(options) {
        try {
            const { page, limit, status } = options;
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            let query = this.supabaseClient
                .from('m2_test_results')
                .select('id,test_id,test_type,url,name,description,status,current_step,created_at,updated_at,config,metrics,raw_data')
                .order('created_at', { ascending: false })
                .range(from, to);
            if (status) {
                query = query.eq('status', status);
            }
            const { data, error } = await query;
            if (error) {
                console.error('Failed to get test results:', error);
                if (error.code === '57014' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
                    console.warn('⚠️ Returning empty page due to timeout');
                    return { results: [], total: 0 };
                }
                if (process.env['NODE_ENV'] === 'production') {
                    console.warn('⚠️ Returning empty results due to database error');
                    return { results: [], total: 0 };
                }
                throw new Error('Failed to get test results');
            }
            const results = data?.map((row, index) => {
                const parsedResult = this.parseResultFromRow(row);
                parsedResult.rowNumber = from + index + 1;
                return parsedResult;
            }) || [];
            return {
                results,
                total: results.length
            };
        }
        catch (error) {
            console.error('Error in getAllResults:', error);
            if (process.env['NODE_ENV'] === 'production') {
                console.warn('⚠️ Returning empty results due to exception');
                return { results: [], total: 0 };
            }
            throw error;
        }
    }
    async getTotalCount() {
        try {
            const { count, error } = await this.supabaseClient
                .from('m2_test_results')
                .select('*', { count: 'exact', head: true })
                .order('created_at', { ascending: false })
                .limit(1000);
            if (error) {
                console.error('Failed to get total count:', error);
                return 0;
            }
            return count || 0;
        }
        catch (error) {
            console.error('Error in getTotalCount:', error);
            return 0;
        }
    }
    async testDatabaseConnection() {
        const startTime = Date.now();
        try {
            const { error } = await this.supabaseClient
                .from('m2_test_results')
                .select('id')
                .limit(1);
            const responseTime = Date.now() - startTime;
            if (error) {
                console.error('Database connection test failed:', error);
                return {
                    connected: false,
                    responseTime,
                    lastError: error.message
                };
            }
            return {
                connected: true,
                responseTime,
                lastError: null
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Database connection test exception:', error);
            return {
                connected: false,
                responseTime,
                lastError: errorMessage
            };
        }
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
    async getRunningTests() {
        try {
            const { data, error } = await this.supabaseClient
                .from('m2_test_results')
                .select('*')
                .eq('status', 'running');
            if (error) {
                console.error('Failed to fetch running tests:', error);
                return [];
            }
            return data ? data.map(row => this.parseResultFromRow(row)) : [];
        }
        catch (error) {
            console.error('Error fetching running tests:', error);
            return [];
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
}
exports.TestResultService = TestResultService;
//# sourceMappingURL=test-result-service.js.map