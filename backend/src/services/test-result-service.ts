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
   * 결과를 DB 행에서 파싱
   */
  private parseResultFromRow(row: any): LoadTestResult {
    return {
      id: row.id,
      testId: row.test_id,
      testType: row.test_type,
      url: row.url,
      name: row.name,
      description: row.description, // description 필드 추가
      status: row.status,
      currentStep: row.current_step,
      metrics: row.metrics || {},
      summary: row.summary || {},
      details: row.details || {},
      config: row.config || {}, // config 필드 추가
      raw_data: row.raw_data, // raw_data 필드 추가
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * 결과 저장 (최초 insert)
   */
  async saveResult(result: LoadTestResult): Promise<void> {
    const { error } = await this.supabaseClient
      .from('m2_test_results')
      .insert([{
        test_id: result.testId,
        name: result.name,
        description: result.description, // description 저장
        url: result.url,
        status: result.status,
        test_type: result.testType,
        current_step: result.currentStep,
        summary: result.summary,
        metrics: result.metrics,
        details: result.details,
        config: result.config, // config 저장
        raw_data: result.raw_data // raw_data 저장
      }]);

    if (error) {
      console.error('Failed to save test result:', error);
      throw error;
    }
  }

  /**
   * 결과 업데이트 (기존 레코드 업데이트)
   */
  async updateResult(result: LoadTestResult): Promise<void> {
    console.log('updateResult called with testId:', result.testId);
    console.log('raw_data length:', result.raw_data?.length || 0);
    
    const { error } = await this.supabaseClient
      .from('m2_test_results')
      .update({
        name: result.name,
        description: result.description, // description 업데이트
        url: result.url,
        status: result.status,
        test_type: result.testType,
        current_step: result.currentStep,
        summary: result.summary,
        metrics: result.metrics,
        details: result.details,
        config: result.config, // config 업데이트
        raw_data: result.raw_data, // raw_data 업데이트
        updated_at: new Date().toISOString()
      })
      .eq('test_id', result.testId);

    if (error) {
      console.error('Failed to update test result:', error);
      throw error;
    } else {
      console.log('Test result updated successfully in DB');
    }
  }

  /**
   * ID로 테스트 결과 조회
   */
  async getResultById(id: string): Promise<LoadTestResult | null> {
    try {
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
        return null; // 에러 대신 null 반환
      }

      return this.parseResultFromRow(data);
    } catch (error) {
      console.error('Error in getResultById:', error);
      return null; // 예외 발생 시 null 반환
    }
  }

  /**
   * 테스트 ID로 결과 조회
   */
  async getResultByTestId(testId: string): Promise<LoadTestResult | null> {
    try {
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
        return null; // 에러 대신 null 반환
      }

      return this.parseResultFromRow(data);
    } catch (error) {
      console.error('Error in getResultByTestId:', error);
      return null; // 예외 발생 시 null 반환
    }
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

    // JavaScript에서 순차 번호 추가 (내림차순)
    const results = data?.map((row, index) => {
      const parsedResult = this.parseResultFromRow(row);
      // 전체 개수에서 현재 인덱스를 빼서 내림차순으로 번호 매기기
      parsedResult.rowNumber = (count || 0) - from - index;
      return parsedResult;
    }) || [];

    return { 
      results, 
      total: count || 0 
    };
  }

  /**
   * 전체 테스트 결과 개수 조회
   */
  async getTotalCount(): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from('m2_test_results')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Failed to get total count:', error);
      throw error;
    }

    return count || 0;
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
} 