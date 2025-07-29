import { supabase } from './supabase-client';

export interface TestType {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: string;
  icon?: string;
  color?: string;
  config_template?: any;
  created_at?: string;
  updated_at?: string;
}

export class TestTypeService {
  /**
   * 모든 테스트 타입 조회
   */
  async getAllTestTypes(): Promise<TestType[]> {
    try {
      const { data, error } = await supabase
        .from('m2_test_types')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching test types:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllTestTypes:', error);
      throw error;
    }
  }

  /**
   * 활성화된 테스트 타입만 조회
   */
  async getEnabledTestTypes(): Promise<TestType[]> {
    try {
      const { data, error } = await supabase
        .from('m2_test_types')
        .select('*')
        .eq('enabled', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching enabled test types:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getEnabledTestTypes:', error);
      throw error;
    }
  }

  /**
   * 테스트 타입 추가
   */
  async addTestType(testType: Omit<TestType, 'created_at' | 'updated_at'>): Promise<TestType> {
    try {
      const { data, error } = await supabase
        .from('m2_test_types')
        .insert([{
          ...testType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding test type:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in addTestType:', error);
      throw error;
    }
  }

  /**
   * 테스트 타입 수정
   */
  async updateTestType(id: string, updates: Partial<TestType>): Promise<TestType> {
    try {
      const { data, error } = await supabase
        .from('m2_test_types')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating test type:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in updateTestType:', error);
      throw error;
    }
  }

  /**
   * 테스트 타입 삭제
   */
  async deleteTestType(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('m2_test_types')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting test type:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error in deleteTestType:', error);
      throw error;
    }
  }

  /**
   * 테스트 타입 활성화/비활성화 토글
   */
  async toggleTestType(id: string, enabled: boolean): Promise<TestType> {
    return this.updateTestType(id, { enabled });
  }

  /**
   * 기본 테스트 타입 초기화
   */
  async initializeDefaultTestTypes(): Promise<void> {
    try {
      const defaultTestTypes = [
        {
          id: 'performance',
          name: '성능테스트',
          description: '웹사이트 성능 및 응답 시간 테스트',
          enabled: true,
          category: 'builtin',
          icon: 'BarChart3',
          color: '#7886C7',
          config_template: { duration: '30s', vus: 10 }
        },
        {
          id: 'load',
          name: '부하테스트',
          description: '높은 부하 상황에서의 시스템 안정성 테스트',
          enabled: true,
          category: 'builtin',
          icon: 'Activity',
          color: '#9BA8E8',
          config_template: { duration: '1m', vus: 50 }
        },
        {
          id: 'stress',
          name: '스트레스테스트',
          description: '시스템 한계점을 찾는 테스트',
          enabled: true,
          category: 'builtin',
          icon: 'Zap',
          color: '#6773C0',
          config_template: { duration: '2m', vus: 100 }
        },
        {
          id: 'spike',
          name: '스파이크테스트',
          description: '갑작스러운 트래픽 증가 테스트',
          enabled: true,
          category: 'builtin',
          icon: 'TrendingUp',
          color: '#4F5BA3',
          config_template: { duration: '30s', vus: 200 }
        },
        {
          id: 'security',
          name: '보안테스트',
          description: '웹사이트 보안 취약점 테스트',
          enabled: true,
          category: 'builtin',
          icon: 'Shield',
          color: '#A9B5DF',
          config_template: { duration: '1m', vus: 5 }
        },
        {
          id: 'accessibility',
          name: '접근성테스트',
          description: '웹 접근성 준수 검사',
          enabled: true,
          category: 'builtin',
          icon: 'Eye',
          color: '#7886C7',
          config_template: { duration: '30s', vus: 1 }
        }
      ];

      // 기존 데이터 확인
      const { data: existingData } = await supabase
        .from('m2_test_types')
        .select('id')
        .in('id', defaultTestTypes.map(t => t.id));

      const existingIds = existingData?.map(t => t.id) || [];
      const newTestTypes = defaultTestTypes.filter(t => !existingIds.includes(t.id));

      if (newTestTypes.length > 0) {
        const { error } = await supabase
          .from('m2_test_types')
          .insert(newTestTypes.map(t => ({
            ...t,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })));

        if (error) {
          console.error('Error initializing default test types:', error);
          throw new Error(error.message);
        }
      }
    } catch (error) {
      console.error('Error in initializeDefaultTestTypes:', error);
      throw error;
    }
  }
} 