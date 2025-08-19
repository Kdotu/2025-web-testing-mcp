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
   * 연결 테스트 (재시도 로직 포함)
   */
  private async testConnection(): Promise<void> {
    const maxRetries = 3;
    const retryDelay = 2000; // 2초
    
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
      } catch (error) {
        console.error(`Supabase connection test failed (attempt ${attempt}):`, error);
        if (attempt === maxRetries) {
          console.error('All connection attempts failed');
          // 프로덕션에서는 연결 실패해도 계속 실행
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
      updatedAt: row.updated_at,
      // 프론트엔드 호환성을 위한 필드 추가
      startTime: row.created_at,
      endTime: row.status === 'completed' || row.status === 'failed' ? row.updated_at : undefined,
      duration: row.status === 'completed' || row.status === 'failed' ? 
        this.calculateDuration(row.created_at, row.updated_at) : undefined
    };
  }

  /**
   * 경과 시간 계산 (MM:SS 형식)
   */
  private calculateDuration(startTime: string, endTime: string): string {
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
    } catch (error) {
      console.error('Error calculating duration:', error);
      return '00:00';
    }
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
    try {
      const { page, limit, status } = options;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // 조건 쿼리 생성 - count를 제거하여 성능 향상
      // 목록 화면에는 가벼운 컬럼만 조회 (raw_data, metrics 등 대용량 컬럼 제외)
      let query = this.supabaseClient
        .from('m2_test_results')
        .select('id,test_id,test_type,url,name,description,status,current_step,created_at,updated_at');

      if (status) {
        query = query.eq('status', status);
      }

      // 페이지네이션 적용
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Failed to get test results:', error);
        // 타임아웃이나 서버 과부하 시에는 빈 결과 반환하여 UI 지연 방지
        if (error.code === '57014' || error.code === 'ETIMEDOUT') {
          console.warn('⚠️ Returning empty page due to timeout');
          return { results: [], total: 0 };
        }
        // 프로덕션에서는 빈 결과 반환
        if (process.env['NODE_ENV'] === 'production') {
          console.warn('⚠️ Returning empty results due to database error');
          return { results: [], total: 0 };
        }
        throw new Error('Failed to get test results');
      }

      // JavaScript에서 순차 번호 추가 (내림차순)
      const results = data?.map((row, index) => {
        const parsedResult = this.parseResultFromRow(row);
        // 페이지 기반으로 번호 매기기
        parsedResult.rowNumber = from + index + 1;
        return parsedResult;
      }) || [];

      // 전체 개수는 별도로 조회하지 않고 현재 페이지 결과만 반환
      return { 
        results, 
        total: results.length 
      };
    } catch (error) {
      console.error('Error in getAllResults:', error);
      // 프로덕션에서는 빈 결과 반환
      if (process.env['NODE_ENV'] === 'production') {
        console.warn('⚠️ Returning empty results due to exception');
        return { results: [], total: 0 };
      }
      throw error;
    }
  }

  /**
   * 전체 테스트 결과 개수 조회 (최적화된 버전)
   */
  async getTotalCount(): Promise<number> {
    try {
      // 최근 1000개 결과만 카운트하여 성능 향상
      const { count, error } = await this.supabaseClient
        .from('m2_test_results')
        .select('*', { count: 'exact', head: true })
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('Failed to get total count:', error);
        // 에러 발생 시 기본값 반환
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getTotalCount:', error);
      // 예외 발생 시 기본값 반환
      return 0;
    }
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
   * running 상태의 모든 테스트 조회
   */
  async getRunningTests(): Promise<LoadTestResult[]> {
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
    } catch (error) {
      console.error('Error fetching running tests:', error);
      return [];
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