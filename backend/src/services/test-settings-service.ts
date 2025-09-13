import { supabase } from './supabase-client';

export interface TestSetting {
  id: number;
  name: string;
  category: string;
  value: any;
  description: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSettingData {
  name: string;
  category: string;
  value: any;
  description?: string;
  priority?: number;
  isActive?: boolean;
}

export interface UpdateSettingData {
  name?: string;
  category?: string;
  value?: any;
  description?: string;
  priority?: number;
  isActive?: boolean;
}

export interface SearchParams {
  query?: string;
  category?: string;
  isActive?: boolean;
}

export class TestSettingsService {
  private tableName = 'm2_test_settings';

  /**
   * 모든 테스트 설정 조회
   */
  async getAllSettings(): Promise<TestSetting[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('priority', { ascending: false })
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('[TestSettings Service] Get all settings error:', error);
        throw new Error(`Failed to get settings: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[TestSettings Service] Get all settings failed:', error);
      throw error;
    }
  }

  /**
   * ID로 특정 설정 조회
   */
  async getSettingById(id: number): Promise<TestSetting | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 설정을 찾을 수 없음
        }
        console.error('[TestSettings Service] Get setting by ID error:', error);
        throw new Error(`Failed to get setting: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[TestSettings Service] Get setting by ID failed:', error);
      throw error;
    }
  }

  /**
   * 새 설정 생성
   */
  async createSetting(settingData: CreateSettingData): Promise<TestSetting> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert([{
          name: settingData.name,
          category: settingData.category,
          value: settingData.value,
          description: settingData.description || '',
          priority: settingData.priority || 0,
          isActive: settingData.isActive !== false
        }])
        .select()
        .single();

      if (error) {
        console.error('[TestSettings Service] Create setting error:', error);
        throw new Error(`Failed to create setting: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[TestSettings Service] Create setting failed:', error);
      throw error;
    }
  }

  /**
   * 설정 업데이트
   */
  async updateSetting(id: number, updateData: UpdateSettingData): Promise<TestSetting | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          ...updateData,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 설정을 찾을 수 없음
        }
        console.error('[TestSettings Service] Update setting error:', error);
        throw new Error(`Failed to update setting: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[TestSettings Service] Update setting failed:', error);
      throw error;
    }
  }

  /**
   * 설정 삭제
   */
  async deleteSetting(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[TestSettings Service] Delete setting error:', error);
        throw new Error(`Failed to delete setting: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('[TestSettings Service] Delete setting failed:', error);
      throw error;
    }
  }

  /**
   * 카테고리별 설정 조회
   */
  async getSettingsByCategory(category: string): Promise<TestSetting[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('category', category)
        .order('priority', { ascending: false })
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('[TestSettings Service] Get settings by category error:', error);
        throw new Error(`Failed to get settings by category: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[TestSettings Service] Get settings by category failed:', error);
      throw error;
    }
  }

  /**
   * 설정 검색
   */
  async searchSettings(searchParams: SearchParams): Promise<TestSetting[]> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*');

      // 텍스트 검색
      if (searchParams.query) {
        query = query.or(`name.ilike.%${searchParams.query}%,description.ilike.%${searchParams.query}%`);
      }

      // 카테고리 필터
      if (searchParams.category) {
        query = query.eq('category', searchParams.category);
      }

      // 활성 상태 필터
      if (searchParams.isActive !== undefined) {
        query = query.eq('isActive', searchParams.isActive);
      }

      const { data, error } = await query
        .order('priority', { ascending: false })
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('[TestSettings Service] Search settings error:', error);
        throw new Error(`Failed to search settings: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[TestSettings Service] Search settings failed:', error);
      throw error;
    }
  }

  /**
   * 설정 카테고리 목록 조회
   */
  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('category')
        .not('category', 'is', null);

      if (error) {
        console.error('[TestSettings Service] Get categories error:', error);
        throw new Error(`Failed to get categories: ${error.message}`);
      }

      // 중복 제거 및 정렬
      const categories = [...new Set(data?.map(item => item.category) || [])].sort();
      return categories;
    } catch (error) {
      console.error('[TestSettings Service] Get categories failed:', error);
      throw error;
    }
  }
}
