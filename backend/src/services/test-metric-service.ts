import { createClient } from '@supabase/supabase-js';

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

export class TestMetricService {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not found, using mock data');
      this.supabase = null;
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * 테스트 ID로 모든 메트릭 조회
   */
  async getMetricsByTestId(testId: string): Promise<TestMetric[]> {
    try {
      console.log('TestMetricService: Fetching metrics for testId:', testId);
      
      // Supabase가 없으면 Mock 데이터 반환
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
    } catch (error) {
      console.error('Failed to get metrics by test ID:', error);
      // 오류 시 Mock 데이터 반환
      return this.getMockMetrics(testId);
    }
  }

  /**
   * 메트릭을 타입별로 그룹화하여 조회
   */
  async getMetricsGroupedByType(testId: string): Promise<{ [metricType: string]: TestMetric[] }> {
    try {
      const metrics = await this.getMetricsByTestId(testId);
      const grouped: { [metricType: string]: TestMetric[] } = {};

      metrics.forEach(metric => {
        if (!grouped[metric.metric_type]) {
          grouped[metric.metric_type] = [];
        }
        grouped[metric.metric_type]!.push(metric);
      });

      return grouped;
    } catch (error) {
      console.error('Failed to get grouped metrics:', error);
      throw error;
    }
  }

  /**
   * 특정 메트릭 타입의 메트릭들 조회
   */
  async getMetricsByType(testId: string, metricType: string): Promise<TestMetric[]> {
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
    } catch (error) {
      console.error('Failed to get metrics by type:', error);
      throw error;
    }
  }

  /**
   * 특정 메트릭 조회
   */
  async getMetric(testId: string, metricType: string, metricName: string): Promise<TestMetric | null> {
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
          return null; // 데이터가 없는 경우
        }
        console.error('Error fetching metric:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get metric:', error);
      throw error;
    }
  }

  /**
   * 메트릭 저장 (단일 또는 다중)
   */
  async saveMetrics(metrics: Partial<TestMetric>[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('m2_test_metrics')
        .insert(metrics);

      if (error) {
        console.error('Error saving metrics:', error);
        throw error;
      }

      console.log(`Saved ${metrics.length} metrics to database`);
    } catch (error) {
      console.error('Failed to save metrics:', error);
      throw error;
    }
  }

  /**
   * 메트릭 업데이트
   */
  async updateMetric(id: string, updates: Partial<TestMetric>): Promise<void> {
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
    } catch (error) {
      console.error('Failed to update metric:', error);
      throw error;
    }
  }

  /**
   * 테스트 ID로 메트릭 삭제
   */
  async deleteMetricsByTestId(testId: string): Promise<void> {
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
    } catch (error) {
      console.error('Failed to delete metrics:', error);
      throw error;
    }
  }

  /**
   * 메트릭 통계 조회 (예: 평균, 최대, 최소 등)
   */
  async getMetricStats(testId: string, metricType: string, metricName: string): Promise<any> {
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

      const values = data.map((row: any) => row.value).filter((val: any) => val !== null);
      
      if (values.length === 0) {
        return null;
      }

      return {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum: number, val: number) => sum + val, 0) / values.length
      };
    } catch (error) {
      console.error('Failed to get metric stats:', error);
      throw error;
    }
  }

  /**
   * Mock 메트릭 데이터 생성
   */
  private getMockMetrics(testId: string): TestMetric[] {
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