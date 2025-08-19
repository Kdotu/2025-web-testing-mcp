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
  mcp_tool?: string;
  is_locked?: boolean;
  locked_by?: string;
  lock_type?: 'config' | 'execution';
  created_at?: string;
  updated_at?: string;
}

export class TestTypeService {
  constructor() {
    // DB 기반 잠금 시스템 사용
  }

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
      // 테스트 타입이 잠겨있는지 확인
      const existingTestType = await this.getTestTypeById(id);
      if (!existingTestType) {
        throw new Error(`테스트 타입 '${id}'을 찾을 수 없습니다.`);
      }

      // 잠금 해제를 위한 업데이트인 경우 허용
      if (existingTestType.is_locked && updates.is_locked === false) {
        console.log(`[TestTypeService] 테스트 타입 '${id}'의 잠금 해제 허용`);
        // 잠금 해제 시에는 다른 필드 수정도 허용
      }
      // 잠금 상태에서 다른 필드 수정을 시도하는 경우 차단 (단, 잠금 해제는 제외)
      else if (existingTestType.is_locked && updates.is_locked !== false && updates.is_locked !== undefined) {
        throw new Error(`테스트 타입 '${existingTestType.name}'이(가) 잠겨있습니다. 테스트 ID: ${existingTestType.locked_by}`);
      }

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
      // 테스트 타입이 잠겨있는지 확인
      const existingTestType = await this.getTestTypeById(id);
      if (!existingTestType) {
        throw new Error(`테스트 타입 '${id}'을 찾을 수 없습니다.`);
      }

      // 잠금된 테스트 타입은 삭제 불가
      if (existingTestType.is_locked) {
        throw new Error(`테스트 타입 '${existingTestType.name}'이(가) 잠겨있습니다. 테스트 ID: ${existingTestType.locked_by}`);
      }

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
   * 테스트 실행 시 설정 잠금 획득 (비활성화됨)
   */
  async acquireTestConfigLock(testTypeId: string, _testId: string): Promise<boolean> {
    // 테스트 타입 잠금 시스템 비활성화 - 항상 true 반환
    console.log(`[TestTypeService] 테스트 타입 잠금 시스템 비활성화됨 - '${testTypeId}' 잠금 획득 허용`);
    return true;
  }

  /**
   * 테스트 완료 시 설정 잠금 해제 (비활성화됨)
   */
  async releaseTestConfigLock(testTypeId: string, _testId: string): Promise<boolean> {
    // 테스트 타입 잠금 시스템 비활성화 - 항상 true 반환
    console.log(`[TestTypeService] 테스트 타입 잠금 시스템 비활성화됨 - '${testTypeId}' 잠금 해제 허용`);
    return true;
  }

  /**
   * 테스트 타입 ID로 조회
   */
  async getTestTypeById(id: string): Promise<TestType | null> {
    try {
      const { data, error } = await supabase
        .from('m2_test_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching test type by id:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTestTypeById:', error);
      return null;
    }
  }

  /**
   * 잠금된 테스트 타입 조회
   */
  async getLockedTestTypes(): Promise<TestType[]> {
    try {
      const { data, error } = await supabase
        .from('m2_test_types')
        .select('*')
        .eq('is_locked', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching locked test types:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getLockedTestTypes:', error);
      throw error;
    }
  }

  /**
   * 테스트 타입 잠금 강제 해제 (관리자용)
   */
  async forceReleaseLock(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('m2_test_types')
        .update({
          is_locked: false,
          locked_by: null,
          lock_type: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error force releasing lock:', error);
        return false;
      }

      console.log(`[TestTypeService] 테스트 타입 '${id}' 잠금 강제 해제 완료`);
      return true;
    } catch (error) {
      console.error('Error in forceReleaseLock:', error);
      return false;
    }
  }


} 