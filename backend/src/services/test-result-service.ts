import { LoadTestResult } from '../types';
import { supabase, createServiceClient } from './supabase-client';

interface GetAllResultsOptions {
  page: number;
  limit: number;
  status?: string;
}

/**
 * 테스트 결과 Supabase 서비스
 */
export class TestResultService {
  private supabaseClient = supabase;
  private serviceClient = createServiceClient();

  constructor() {
    // 연결 테스트
    this.testConnection();
  }

  /**
   * 연결 테스트
   */
  private async testConnection(): Promise<void> {
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
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      throw error;
    }
  }

  /**
   * 테스트 결과 저장
   */
  async saveResult(result: LoadTestResult): Promise<void> {
    const { error } = await this.serviceClient
      .from('m2_test_results')
      .insert({
        id: result.id,
        test_id: result.testId,
        test_type: result.testType || 'load', // 기본값은 load
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

  /**
   * 테스트 결과 업데이트
   */
  async updateResult(result: LoadTestResult): Promise<void> {
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

  /**
   * ID로 테스트 결과 조회
   */
  async getResultById(id: string): Promise<LoadTestResult | null> {
    const { data, error } = await this.supabaseClient
      .from('m2_test_results')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 결과가 없음
      }
      console.error('Failed to get test result:', error);
      throw new Error('Failed to get test result');
    }

    return this.parseResultFromRow(data);
  }

  /**
   * 테스트 ID로 결과 조회
   */
  async getResultByTestId(testId: string): Promise<LoadTestResult | null> {
    const { data, error } = await this.supabaseClient
      .from('m2_test_results')
      .select('*')
      .eq('test_id', testId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 결과가 없음
      }
      console.error('Failed to get test result:', error);
      throw new Error('Failed to get test result');
    }

    return this.parseResultFromRow(data);
  }

  /**
   * 모든 테스트 결과 조회 (페이지네이션)
   */
  async getAllResults(options: GetAllResultsOptions): Promise<{
    results: LoadTestResult[];
    total: number;
  }> {
    const { page, limit, status } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 조건 쿼리 생성
    let query = this.supabaseClient
      .from('m2_test_results')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    // 페이지네이션 적용
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

  /**
   * 테스트 결과 삭제
   */
  async deleteResult(id: string): Promise<void> {
    const { error } = await this.serviceClient
      .from('m2_test_results')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete test result:', error);
      throw new Error('Failed to delete test result');
    }
  }

  /**
   * 통계 조회
   */
  async getStatistics(): Promise<{
    totalTests: number;
    completedTests: number;
    failedTests: number;
    averageResponseTime: number;
    averageErrorRate: number;
  }> {
    // 전체 테스트 수
    const { count: totalTests } = await this.supabaseClient
      .from('m2_test_results')
      .select('*', { count: 'exact', head: true });

    // 완료된 테스트 수
    const { count: completedTests } = await this.supabaseClient
      .from('m2_test_results')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // 실패한 테스트 수
    const { count: failedTests } = await this.supabaseClient
      .from('m2_test_results')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    // 평균 응답 시간 및 에러율 계산
    const { data: metricsData } = await this.supabaseClient
      .from('m2_test_results')
      .select('metrics')
      .not('metrics', 'is', null);

    let totalResponseTime = 0;
    let totalErrorRate = 0;
    let validMetricsCount = 0;

    metricsData?.forEach((row: any) => {
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

  /**
   * 행 데이터를 LoadTestResult로 파싱
   */
  private parseResultFromRow(row: any): LoadTestResult {
    return {
      id: row.id,
      testId: row.test_id,
      testType: row.test_type,
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