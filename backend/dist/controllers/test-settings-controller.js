"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestSettingsController = void 0;
const test_settings_service_1 = require("../services/test-settings-service");
class TestSettingsController {
    constructor() {
        this.testSettingsService = new test_settings_service_1.TestSettingsService();
    }
    async getAllSettings(_req, res) {
        try {
            const settings = await this.testSettingsService.getAllSettings();
            res.status(200).json({
                success: true,
                data: settings
            });
        }
        catch (error) {
            console.error('[TestSettings Controller] Get all settings failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async getSettingById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID parameter is required'
                });
                return;
            }
            const setting = await this.testSettingsService.getSettingById(parseInt(id));
            if (!setting) {
                res.status(404).json({
                    success: false,
                    error: 'Setting not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: setting
            });
        }
        catch (error) {
            console.error('[TestSettings Controller] Get setting by ID failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async createSetting(req, res) {
        try {
            const { name, category, value, description, priority, isActive } = req.body;
            if (!name || !category || value === undefined) {
                res.status(400).json({
                    success: false,
                    error: 'name, category, and value are required'
                });
                return;
            }
            const settingData = {
                name,
                category,
                value,
                description: description || '',
                priority: priority || 0,
                isActive: isActive !== false
            };
            const newSetting = await this.testSettingsService.createSetting(settingData);
            res.status(201).json({
                success: true,
                data: newSetting
            });
        }
        catch (error) {
            console.error('[TestSettings Controller] Create setting failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async updateSetting(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID parameter is required'
                });
                return;
            }
            const updateData = req.body;
            const updatedSetting = await this.testSettingsService.updateSetting(parseInt(id), updateData);
            if (!updatedSetting) {
                res.status(404).json({
                    success: false,
                    error: 'Setting not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updatedSetting
            });
        }
        catch (error) {
            console.error('[TestSettings Controller] Update setting failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async deleteSetting(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID parameter is required'
                });
                return;
            }
            const deleted = await this.testSettingsService.deleteSetting(parseInt(id));
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Setting not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Setting deleted successfully'
            });
        }
        catch (error) {
            console.error('[TestSettings Controller] Delete setting failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async getSettingsByCategory(req, res) {
        try {
            const { category } = req.params;
            if (!category) {
                res.status(400).json({
                    success: false,
                    error: 'Category parameter is required'
                });
                return;
            }
            const settings = await this.testSettingsService.getSettingsByCategory(category);
            res.status(200).json({
                success: true,
                data: settings
            });
        }
        catch (error) {
            console.error('[TestSettings Controller] Get settings by category failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async searchSettings(req, res) {
        try {
            const { q, category, isActive } = req.query;
            const searchParams = {
                query: q,
                category: category,
                isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
            };
            const settings = await this.testSettingsService.searchSettings(searchParams);
            res.status(200).json({
                success: true,
                data: settings
            });
        }
        catch (error) {
            console.error('[TestSettings Controller] Search settings failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
}
exports.TestSettingsController = TestSettingsController;
//# sourceMappingURL=test-settings-controller.js.map