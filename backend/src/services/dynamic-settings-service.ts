import { supabase } from '../services/supabase-client';
import { TestLayoutService } from './test-layout-service';

export interface FieldValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'number' | 'custom';
  value?: any;
  message: string;
}

export interface FieldValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SettingsValidationResult {
  isValid: boolean;
  errors: { [fieldName: string]: string[] };
}

export interface TestConfig {
  [key: string]: any;
}

export class DynamicSettingsService {
  private testLayoutService: TestLayoutService;

  constructor() {
    this.testLayoutService = new TestLayoutService();
  }

  // 레이아웃 기반 설정 폼 생성
  async generateSettingsForm(testType: string, _layoutId?: string) {
    try {
      // 레이아웃 정보 가져오기
      const layoutResult = await this.testLayoutService.getLayoutsByTestType(testType);
      
      if (!layoutResult || layoutResult.length === 0) {
        return {
          success: false,
          error: '레이아웃을 찾을 수 없습니다.'
        };
      }

      const layout = layoutResult[0]; // 첫 번째 레이아웃 사용
      
      if (!layout) {
        return {
          success: false,
          error: '레이아웃을 찾을 수 없습니다.'
        };
      }
      
      // 폼 구조 생성
      const formStructure = {
        testType: layout.testType,
        layoutId: layout.id,
        sections: layout.sections.map((section: any) => ({
          id: section.id,
          title: section.sectionTitle,
          description: section.sectionDescription,
          isCollapsible: section.isCollapsible,
          isExpanded: section.isExpanded,
          fields: section.fields.map((field: any) => ({
            id: field.id,
            name: field.fieldName,
            type: field.fieldType,
            label: field.label,
            placeholder: field.placeholder,
            description: field.description,
            required: field.isRequired,
            visible: field.isVisible,
            width: field.fieldWidth,
            height: field.fieldHeight || 'auto',
            defaultValue: field.defaultValue,
            options: field.options,
            validationRules: field.validationRules || []
          }))
        }))
      };

      return {
        success: true,
        data: formStructure
      };
    } catch (error) {
      console.error('Error generating settings form:', error);
      return {
        success: false,
        error: '설정 폼 생성 중 오류가 발생했습니다.'
      };
    }
  }

  // 개별 필드 유효성 검사
  async validateField(fieldId: string, value: any): Promise<FieldValidationResult> {
    try {
      // 필드 정보 가져오기
      const { data: field, error } = await supabase
        .from('m2_test_layout_fields')
        .select('*')
        .eq('id', fieldId)
        .single();

      if (error || !field) {
        return {
          isValid: false,
          errors: ['필드를 찾을 수 없습니다.']
        };
      }

      const errors: string[] = [];
      const validationRules = field.validation_rules as FieldValidationRule[] || [];

      // 각 유효성 검사 규칙 적용
      for (const rule of validationRules) {
        const result = this.applyValidationRule(value, rule);
        if (!result.isValid) {
          errors.push(result.message);
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error validating field:', error);
      return {
        isValid: false,
        errors: ['유효성 검사 중 오류가 발생했습니다.']
      };
    }
  }

  // 유효성 검사 규칙 적용
  private applyValidationRule(value: any, rule: FieldValidationRule): { isValid: boolean; message: string } {
    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'min':
        if (typeof value === 'number' && value < rule.value) {
          return { isValid: false, message: rule.message };
        }
        if (typeof value === 'string' && value.length < rule.value) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'max':
        if (typeof value === 'number' && value > rule.value) {
          return { isValid: false, message: rule.message };
        }
        if (typeof value === 'string' && value.length > rule.value) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'pattern':
        if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'email':
        if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'url':
        if (typeof value === 'string' && !/^https?:\/\/.+/.test(value)) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'number':
        if (isNaN(Number(value))) {
          return { isValid: false, message: rule.message };
        }
        break;
    }

    return { isValid: true, message: '' };
  }

  // 설정값 저장
  async saveSettings(testType: string, settings: Record<string, any>, layoutId?: string) {
    try {
      // 설정값을 JSON으로 저장 (실제 구현에서는 별도 테이블 사용 가능)
      const { data, error } = await supabase
        .from('m2_test_settings')
        .upsert({
          test_type: testType,
          layout_id: layoutId,
          settings_data: settings,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        return {
          success: false,
          error: '설정값 저장에 실패했습니다.'
        };
      }

      return {
        success: true,
        data: data[0]
      };
    } catch (error) {
      console.error('Error saving settings:', error);
      return {
        success: false,
        error: '설정값 저장 중 오류가 발생했습니다.'
      };
    }
  }

  // 설정값 로드
  async loadSettings(testType: string, layoutId?: string) {
    try {
      const { data, error } = await supabase
        .from('m2_test_settings')
        .select('*')
        .eq('test_type', testType)
        .eq('layout_id', layoutId || null)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        return {
          success: false,
          error: '설정값 로드에 실패했습니다.'
        };
      }

      return {
        success: true,
        data: data[0]?.settings_data || {}
      };
    } catch (error) {
      console.error('Error loading settings:', error);
      return {
        success: false,
        error: '설정값 로드 중 오류가 발생했습니다.'
      };
    }
  }

  // 전체 설정값 검증
  async validateSettings(testType: string, settings: Record<string, any>, _layoutId?: string): Promise<SettingsValidationResult> {
    try {
      // 레이아웃 정보 가져오기
      const layoutResult = await this.testLayoutService.getLayoutsByTestType(testType);
      
      if (!layoutResult || layoutResult.length === 0) {
        return {
          isValid: false,
          errors: { general: ['레이아웃을 찾을 수 없습니다.'] }
        };
      }

      const layout = layoutResult[0]; // 첫 번째 레이아웃 사용
      
      if (!layout) {
        return {
          isValid: false,
          errors: { general: ['레이아웃을 찾을 수 없습니다.'] }
        };
      }
      
      const errors: { [fieldName: string]: string[] } = {};

      // 각 섹션의 필드 검증
      for (const section of layout.sections) {
        for (const field of section.fields) {
          if (!field.isVisible) continue;

          const value = settings[field.fieldName];
          const fieldValidation = await this.validateField(field.id.toString(), value);
          
          if (!fieldValidation.isValid) {
            errors[field.fieldName] = fieldValidation.errors;
          }
        }
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    } catch (error) {
      console.error('Error validating settings:', error);
      return {
        isValid: false,
        errors: { general: ['설정값 검증 중 오류가 발생했습니다.'] }
      };
    }
  }

  // 테스트 실행을 위한 설정값 변환
  async convertToTestConfig(testType: string, settings: Record<string, any>, _layoutId?: string) {
    try {
      // 레이아웃 정보 가져오기
      const layoutResult = await this.testLayoutService.getLayoutsByTestType(testType);
      
      if (!layoutResult || layoutResult.length === 0) {
        return {
          success: false,
          error: '레이아웃을 찾을 수 없습니다.'
        };
      }

      const layout = layoutResult[0]; // 첫 번째 레이아웃 사용
      
      if (!layout) {
        return {
          success: false,
          error: '레이아웃을 찾을 수 없습니다.'
        };
      }
      
      const testConfig: TestConfig = {};

      // 각 섹션의 필드에서 테스트 설정 추출
      for (const section of layout.sections) {
        for (const field of section.fields) {
          if (!field.isVisible) continue;

          const value = settings[field.fieldName];
          if (value !== undefined && value !== null && value !== '') {
            // 필드 타입에 따른 변환
            switch (field.fieldType) {
              case 'number':
                testConfig[field.fieldName] = Number(value);
                break;
              case 'switch':
                testConfig[field.fieldName] = Boolean(value);
                break;
              case 'checkbox':
                // 체크박스는 배열로 처리
                if (Array.isArray(value)) {
                  testConfig[field.fieldName] = value;
                } else {
                  testConfig[field.fieldName] = [value];
                }
                break;
              default:
                testConfig[field.fieldName] = value;
                break;
            }
          }
        }
      }

      return {
        success: true,
        data: testConfig
      };
    } catch (error) {
      console.error('Error converting to test config:', error);
      return {
        success: false,
        error: '테스트 설정 변환 중 오류가 발생했습니다.'
      };
    }
  }
}
