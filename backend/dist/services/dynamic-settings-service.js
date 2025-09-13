"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicSettingsService = void 0;
const supabase_client_1 = require("../services/supabase-client");
const test_layout_service_1 = require("./test-layout-service");
class DynamicSettingsService {
    constructor() {
        this.testLayoutService = new test_layout_service_1.TestLayoutService();
    }
    async generateSettingsForm(testType, _layoutId) {
        try {
            const layoutResult = await this.testLayoutService.getLayoutsByTestType(testType);
            if (!layoutResult || layoutResult.length === 0) {
                return {
                    success: false,
                    error: '레이아웃을 찾을 수 없습니다.'
                };
            }
            const layout = layoutResult[0];
            if (!layout) {
                return {
                    success: false,
                    error: '레이아웃을 찾을 수 없습니다.'
                };
            }
            const formStructure = {
                testType: layout.testType,
                layoutId: layout.id,
                sections: layout.sections.map((section) => ({
                    id: section.id,
                    title: section.sectionTitle,
                    description: section.sectionDescription,
                    isCollapsible: section.isCollapsible,
                    isExpanded: section.isExpanded,
                    fields: section.fields.map((field) => ({
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
        }
        catch (error) {
            console.error('Error generating settings form:', error);
            return {
                success: false,
                error: '설정 폼 생성 중 오류가 발생했습니다.'
            };
        }
    }
    async validateField(fieldId, value) {
        try {
            const { data: field, error } = await supabase_client_1.supabase
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
            const errors = [];
            const validationRules = field.validation_rules || [];
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
        }
        catch (error) {
            console.error('Error validating field:', error);
            return {
                isValid: false,
                errors: ['유효성 검사 중 오류가 발생했습니다.']
            };
        }
    }
    applyValidationRule(value, rule) {
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
    async saveSettings(testType, settings, layoutId) {
        try {
            const { data, error } = await supabase_client_1.supabase
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
        }
        catch (error) {
            console.error('Error saving settings:', error);
            return {
                success: false,
                error: '설정값 저장 중 오류가 발생했습니다.'
            };
        }
    }
    async loadSettings(testType, layoutId) {
        try {
            const { data, error } = await supabase_client_1.supabase
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
        }
        catch (error) {
            console.error('Error loading settings:', error);
            return {
                success: false,
                error: '설정값 로드 중 오류가 발생했습니다.'
            };
        }
    }
    async validateSettings(testType, settings, _layoutId) {
        try {
            const layoutResult = await this.testLayoutService.getLayoutsByTestType(testType);
            if (!layoutResult || layoutResult.length === 0) {
                return {
                    isValid: false,
                    errors: { general: ['레이아웃을 찾을 수 없습니다.'] }
                };
            }
            const layout = layoutResult[0];
            if (!layout) {
                return {
                    isValid: false,
                    errors: { general: ['레이아웃을 찾을 수 없습니다.'] }
                };
            }
            const errors = {};
            for (const section of layout.sections) {
                for (const field of section.fields) {
                    if (!field.isVisible)
                        continue;
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
        }
        catch (error) {
            console.error('Error validating settings:', error);
            return {
                isValid: false,
                errors: { general: ['설정값 검증 중 오류가 발생했습니다.'] }
            };
        }
    }
    async convertToTestConfig(testType, settings, _layoutId) {
        try {
            const layoutResult = await this.testLayoutService.getLayoutsByTestType(testType);
            if (!layoutResult || layoutResult.length === 0) {
                return {
                    success: false,
                    error: '레이아웃을 찾을 수 없습니다.'
                };
            }
            const layout = layoutResult[0];
            if (!layout) {
                return {
                    success: false,
                    error: '레이아웃을 찾을 수 없습니다.'
                };
            }
            const testConfig = {};
            for (const section of layout.sections) {
                for (const field of section.fields) {
                    if (!field.isVisible)
                        continue;
                    const value = settings[field.fieldName];
                    if (value !== undefined && value !== null && value !== '') {
                        switch (field.fieldType) {
                            case 'number':
                                testConfig[field.fieldName] = Number(value);
                                break;
                            case 'switch':
                                testConfig[field.fieldName] = Boolean(value);
                                break;
                            case 'checkbox':
                                if (Array.isArray(value)) {
                                    testConfig[field.fieldName] = value;
                                }
                                else {
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
        }
        catch (error) {
            console.error('Error converting to test config:', error);
            return {
                success: false,
                error: '테스트 설정 변환 중 오류가 발생했습니다.'
            };
        }
    }
}
exports.DynamicSettingsService = DynamicSettingsService;
//# sourceMappingURL=dynamic-settings-service.js.map