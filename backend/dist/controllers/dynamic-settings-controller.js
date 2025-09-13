"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicSettingsController = void 0;
const dynamic_settings_service_1 = require("../services/dynamic-settings-service");
class DynamicSettingsController {
    constructor() {
        this.generateSettingsForm = async (req, res) => {
            try {
                const { testType } = req.params;
                const { layoutId } = req.query;
                if (!testType) {
                    res.status(400).json({
                        success: false,
                        error: '테스트 타입이 필요합니다.'
                    });
                    return;
                }
                const result = await this.dynamicSettingsService.generateSettingsForm(testType, layoutId);
                if (result.success) {
                    res.json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Error generating settings form:', error);
                res.status(500).json({
                    success: false,
                    error: '설정 폼 생성 중 오류가 발생했습니다.'
                });
            }
        };
        this.validateField = async (req, res) => {
            try {
                const { fieldId } = req.params;
                const { value } = req.body;
                if (!fieldId || value === undefined) {
                    res.status(400).json({
                        success: false,
                        error: '필드 ID와 값이 필요합니다.'
                    });
                    return;
                }
                const result = await this.dynamicSettingsService.validateField(fieldId, value);
                res.json(result);
            }
            catch (error) {
                console.error('Error validating field:', error);
                res.status(500).json({
                    success: false,
                    error: '필드 유효성 검사 중 오류가 발생했습니다.'
                });
            }
        };
        this.saveSettings = async (req, res) => {
            try {
                const { testType } = req.params;
                const { settings, layoutId } = req.body;
                if (!testType || !settings) {
                    res.status(400).json({
                        success: false,
                        error: '테스트 타입과 설정값이 필요합니다.'
                    });
                    return;
                }
                const result = await this.dynamicSettingsService.saveSettings(testType, settings, layoutId);
                if (result.success) {
                    res.json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Error saving settings:', error);
                res.status(500).json({
                    success: false,
                    error: '설정값 저장 중 오류가 발생했습니다.'
                });
            }
        };
        this.loadSettings = async (req, res) => {
            try {
                const { testType } = req.params;
                const { layoutId } = req.query;
                if (!testType) {
                    res.status(400).json({
                        success: false,
                        error: '테스트 타입이 필요합니다.'
                    });
                    return;
                }
                const result = await this.dynamicSettingsService.loadSettings(testType, layoutId);
                res.json(result);
            }
            catch (error) {
                console.error('Error loading settings:', error);
                res.status(500).json({
                    success: false,
                    error: '설정값 로드 중 오류가 발생했습니다.'
                });
            }
        };
        this.validateSettings = async (req, res) => {
            try {
                const { testType } = req.params;
                const { settings, layoutId } = req.body;
                if (!testType || !settings) {
                    res.status(400).json({
                        success: false,
                        error: '테스트 타입과 설정값이 필요합니다.'
                    });
                    return;
                }
                const result = await this.dynamicSettingsService.validateSettings(testType, settings, layoutId);
                res.json(result);
            }
            catch (error) {
                console.error('Error validating settings:', error);
                res.status(500).json({
                    success: false,
                    error: '설정값 검증 중 오류가 발생했습니다.'
                });
            }
        };
        this.convertToTestConfig = async (req, res) => {
            try {
                const { testType } = req.params;
                const { settings, layoutId } = req.body;
                if (!testType || !settings) {
                    res.status(400).json({
                        success: false,
                        error: '테스트 타입과 설정값이 필요합니다.'
                    });
                    return;
                }
                const result = await this.dynamicSettingsService.convertToTestConfig(testType, settings, layoutId);
                res.json(result);
            }
            catch (error) {
                console.error('Error converting to test config:', error);
                res.status(500).json({
                    success: false,
                    error: '테스트 설정 변환 중 오류가 발생했습니다.'
                });
            }
        };
        this.dynamicSettingsService = new dynamic_settings_service_1.DynamicSettingsService();
    }
}
exports.DynamicSettingsController = DynamicSettingsController;
//# sourceMappingURL=dynamic-settings-controller.js.map