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
    errors: {
        [fieldName: string]: string[];
    };
}
export interface TestConfig {
    [key: string]: any;
}
export declare class DynamicSettingsService {
    private testLayoutService;
    constructor();
    generateSettingsForm(testType: string, _layoutId?: string): Promise<{
        success: boolean;
        error: string;
        data?: never;
    } | {
        success: boolean;
        data: {
            testType: string;
            layoutId: number;
            sections: {
                id: any;
                title: any;
                description: any;
                isCollapsible: any;
                isExpanded: any;
                fields: any;
            }[];
        };
        error?: never;
    }>;
    validateField(fieldId: string, value: any): Promise<FieldValidationResult>;
    private applyValidationRule;
    saveSettings(testType: string, settings: Record<string, any>, layoutId?: string): Promise<{
        success: boolean;
        error: string;
        data?: never;
    } | {
        success: boolean;
        data: any;
        error?: never;
    }>;
    loadSettings(testType: string, layoutId?: string): Promise<{
        success: boolean;
        error: string;
        data?: never;
    } | {
        success: boolean;
        data: any;
        error?: never;
    }>;
    validateSettings(testType: string, settings: Record<string, any>, _layoutId?: string): Promise<SettingsValidationResult>;
    convertToTestConfig(testType: string, settings: Record<string, any>, _layoutId?: string): Promise<{
        success: boolean;
        error: string;
        data?: never;
    } | {
        success: boolean;
        data: TestConfig;
        error?: never;
    }>;
}
//# sourceMappingURL=dynamic-settings-service.d.ts.map