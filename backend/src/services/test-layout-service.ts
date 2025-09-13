import { supabase } from './supabase-client';

export interface LayoutField {
  id: number;
  layoutId: number;
  sectionId: number;
  fieldName: string;
  fieldType: string;
  label: string;
  placeholder?: string;
  description?: string;
  isRequired: boolean;
  isVisible: boolean;
  fieldOrder: number;
  fieldWidth: string;
  defaultValue?: string;
  validationRules?: any;
  options?: any;
  conditionalLogic?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LayoutSection {
  id: number;
  layoutId: number;
  sectionName: string;
  sectionTitle: string;
  sectionDescription?: string;
  sectionOrder: number;
  isCollapsible: boolean;
  isExpanded: boolean;
  createdAt: string;
  updatedAt: string;
  fields: LayoutField[];
}

export interface TestLayout {
  id: number;
  testType: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  sections: LayoutSection[];
}

export interface CreateLayoutData {
  testType: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateLayoutData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateSectionData {
  layoutId: number;
  sectionName: string;
  sectionTitle: string;
  sectionDescription?: string;
  sectionOrder: number;
  isCollapsible?: boolean;
  isExpanded?: boolean;
}

export interface CreateFieldData {
  layoutId: number;
  sectionId: number;
  fieldName: string;
  fieldType: string;
  label: string;
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
  isVisible?: boolean;
  fieldOrder: number;
  fieldWidth?: string;
  defaultValue?: string;
  validationRules?: any;
  options?: any;
  conditionalLogic?: any;
}

export class TestLayoutService {
  private tableName = 'm2_test_layouts';
  private sectionsTableName = 'm2_test_layout_sections';
  private fieldsTableName = 'm2_test_layout_fields';
  // private versionsTableName = 'm2_test_layout_versions';

  /**
   * 모든 레이아웃 조회
   */
  async getAllLayouts(): Promise<TestLayout[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          sections:${this.sectionsTableName}(
            *,
            fields:${this.fieldsTableName}(*)
          )
        `)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('[TestLayout Service] Get all layouts error:', error);
        throw new Error(`Failed to get layouts: ${error.message}`);
      }

      return this.transformLayoutData(data || []);
    } catch (error) {
      console.error('[TestLayout Service] Get all layouts failed:', error);
      throw error;
    }
  }

  /**
   * 테스트 타입별 레이아웃 조회
   */
  async getLayoutsByTestType(testType: string): Promise<TestLayout[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          sections:${this.sectionsTableName}(
            *,
            fields:${this.fieldsTableName}(*)
          )
        `)
        .eq('testType', testType)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('[TestLayout Service] Get layouts by test type error:', error);
        throw new Error(`Failed to get layouts by test type: ${error.message}`);
      }

      return this.transformLayoutData(data || []);
    } catch (error) {
      console.error('[TestLayout Service] Get layouts by test type failed:', error);
      throw error;
    }
  }

  /**
   * ID로 레이아웃 조회
   */
  async getLayoutById(id: number): Promise<TestLayout | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          sections:${this.sectionsTableName}(
            *,
            fields:${this.fieldsTableName}(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 레이아웃을 찾을 수 없음
        }
        console.error('[TestLayout Service] Get layout by ID error:', error);
        throw new Error(`Failed to get layout: ${error.message}`);
      }

      return this.transformLayoutData([data])[0] || null;
    } catch (error) {
      console.error('[TestLayout Service] Get layout by ID failed:', error);
      throw error;
    }
  }

  /**
   * 새 레이아웃 생성
   */
  async createLayout(layoutData: CreateLayoutData): Promise<TestLayout> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert([{
          testType: layoutData.testType,
          name: layoutData.name,
          description: layoutData.description || '',
          isDefault: layoutData.isDefault || false,
          isActive: layoutData.isActive !== false,
          version: 1,
          createdBy: layoutData.createdBy || 'system'
        }])
        .select()
        .single();

      if (error) {
        console.error('[TestLayout Service] Create layout error:', error);
        throw new Error(`Failed to create layout: ${error.message}`);
      }

      return {
        id: data.id,
        testType: data.testType,
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
        isActive: data.isActive,
        version: data.version,
        createdBy: data.createdBy,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        sections: []
      };
    } catch (error) {
      console.error('[TestLayout Service] Create layout failed:', error);
      throw error;
    }
  }

  /**
   * 레이아웃 업데이트
   */
  async updateLayout(id: number, updateData: UpdateLayoutData): Promise<TestLayout | null> {
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
          return null; // 레이아웃을 찾을 수 없음
        }
        console.error('[TestLayout Service] Update layout error:', error);
        throw new Error(`Failed to update layout: ${error.message}`);
      }

      return this.transformLayoutData([data])[0] || null;
    } catch (error) {
      console.error('[TestLayout Service] Update layout failed:', error);
      throw error;
    }
  }

  /**
   * 레이아웃 삭제
   */
  async deleteLayout(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[TestLayout Service] Delete layout error:', error);
        throw new Error(`Failed to delete layout: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('[TestLayout Service] Delete layout failed:', error);
      throw error;
    }
  }

  /**
   * 섹션 생성
   */
  async createSection(sectionData: CreateSectionData): Promise<LayoutSection> {
    try {
      const { data, error } = await supabase
        .from(this.sectionsTableName)
        .insert([{
          layoutId: sectionData.layoutId,
          sectionName: sectionData.sectionName,
          sectionTitle: sectionData.sectionTitle,
          sectionDescription: sectionData.sectionDescription || '',
          sectionOrder: sectionData.sectionOrder,
          isCollapsible: sectionData.isCollapsible || false,
          isExpanded: sectionData.isExpanded !== false
        }])
        .select()
        .single();

      if (error) {
        console.error('[TestLayout Service] Create section error:', error);
        throw new Error(`Failed to create section: ${error.message}`);
      }

      return {
        id: data.id,
        layoutId: data.layoutId,
        sectionName: data.sectionName,
        sectionTitle: data.sectionTitle,
        sectionDescription: data.sectionDescription,
        sectionOrder: data.sectionOrder,
        isCollapsible: data.isCollapsible,
        isExpanded: data.isExpanded,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        fields: []
      };
    } catch (error) {
      console.error('[TestLayout Service] Create section failed:', error);
      throw error;
    }
  }

  /**
   * 필드 생성
   */
  async createField(fieldData: CreateFieldData): Promise<LayoutField> {
    try {
      const { data, error } = await supabase
        .from(this.fieldsTableName)
        .insert([{
          layoutId: fieldData.layoutId,
          sectionId: fieldData.sectionId,
          fieldName: fieldData.fieldName,
          fieldType: fieldData.fieldType,
          label: fieldData.label,
          placeholder: fieldData.placeholder || '',
          description: fieldData.description || '',
          isRequired: fieldData.isRequired || false,
          isVisible: fieldData.isVisible !== false,
          fieldOrder: fieldData.fieldOrder,
          fieldWidth: fieldData.fieldWidth || 'full',
          defaultValue: fieldData.defaultValue || '',
          validationRules: fieldData.validationRules || null,
          options: fieldData.options || null,
          conditionalLogic: fieldData.conditionalLogic || null
        }])
        .select()
        .single();

      if (error) {
        console.error('[TestLayout Service] Create field error:', error);
        throw new Error(`Failed to create field: ${error.message}`);
      }

      return {
        id: data.id,
        layoutId: data.layoutId,
        sectionId: data.sectionId,
        fieldName: data.fieldName,
        fieldType: data.fieldType,
        label: data.label,
        placeholder: data.placeholder,
        description: data.description,
        isRequired: data.isRequired,
        isVisible: data.isVisible,
        fieldOrder: data.fieldOrder,
        fieldWidth: data.fieldWidth,
        defaultValue: data.defaultValue,
        validationRules: data.validationRules,
        options: data.options,
        conditionalLogic: data.conditionalLogic,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    } catch (error) {
      console.error('[TestLayout Service] Create field failed:', error);
      throw error;
    }
  }

  /**
   * 레이아웃 데이터 변환
   */
  private transformLayoutData(data: any[]): TestLayout[] {
    return data.map(layout => ({
      id: layout.id,
      testType: layout.testType,
      name: layout.name,
      description: layout.description,
      isDefault: layout.isDefault,
      isActive: layout.isActive,
      version: layout.version,
      createdBy: layout.createdBy,
      createdAt: layout.createdAt,
      updatedAt: layout.updatedAt,
      sections: (layout.sections || []).map((section: any) => ({
        id: section.id,
        layoutId: section.layoutId,
        sectionName: section.sectionName,
        sectionTitle: section.sectionTitle,
        sectionDescription: section.sectionDescription,
        sectionOrder: section.sectionOrder,
        isCollapsible: section.isCollapsible,
        isExpanded: section.isExpanded,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,
        fields: (section.fields || []).map((field: any) => ({
          id: field.id,
          layoutId: field.layoutId,
          sectionId: field.sectionId,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          label: field.label,
          placeholder: field.placeholder,
          description: field.description,
          isRequired: field.isRequired,
          isVisible: field.isVisible,
          fieldOrder: field.fieldOrder,
          fieldWidth: field.fieldWidth,
          defaultValue: field.defaultValue,
          validationRules: field.validationRules,
          options: field.options,
          conditionalLogic: field.conditionalLogic,
          createdAt: field.createdAt,
          updatedAt: field.updatedAt
        }))
      }))
    }));
  }
}
