"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestTypeController = void 0;
const test_type_service_1 = require("../services/test-type-service");
const error_handler_1 = require("../middleware/error-handler");
class TestTypeController {
    constructor() {
        this.testTypeService = new test_type_service_1.TestTypeService();
    }
    async getAllTestTypes(_req, res, next) {
        try {
            const testTypes = await this.testTypeService.getAllTestTypes();
            res.json({
                success: true,
                data: testTypes,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getEnabledTestTypes(_req, res, next) {
        try {
            const testTypes = await this.testTypeService.getEnabledTestTypes();
            res.json({
                success: true,
                data: testTypes,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            next(error);
        }
    }
    async addTestType(req, res, next) {
        try {
            const { id, name, description, enabled, category, icon, color, config_template, mcp_tool } = req.body;
            if (!id || !name) {
                throw (0, error_handler_1.createValidationError)('ID와 이름은 필수입니다.');
            }
            const newTestType = {
                id,
                name,
                description: description || '',
                enabled: enabled !== undefined ? enabled : true,
                category: category || 'custom',
                icon: icon || 'Settings',
                color: color || '#A9B5DF',
                config_template: config_template || {},
                mcp_tool: mcp_tool || ''
            };
            const result = await this.testTypeService.addTestType(newTestType);
            res.status(201).json({
                success: true,
                data: result,
                message: '테스트 타입이 추가되었습니다.',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateTestType(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;
            if (!id) {
                throw (0, error_handler_1.createValidationError)('테스트 타입 ID가 필요합니다.');
            }
            const result = await this.testTypeService.updateTestType(id, updates);
            res.json({
                success: true,
                data: result,
                message: '테스트 타입이 수정되었습니다.',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteTestType(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw (0, error_handler_1.createValidationError)('테스트 타입 ID가 필요합니다.');
            }
            await this.testTypeService.deleteTestType(id);
            res.json({
                success: true,
                message: '테스트 타입이 삭제되었습니다.',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            next(error);
        }
    }
    async toggleTestType(req, res, next) {
        try {
            const { id } = req.params;
            const { enabled } = req.body;
            if (!id) {
                throw (0, error_handler_1.createValidationError)('테스트 타입 ID가 필요합니다.');
            }
            if (typeof enabled !== 'boolean') {
                throw (0, error_handler_1.createValidationError)('enabled 값은 boolean이어야 합니다.');
            }
            const result = await this.testTypeService.toggleTestType(id, enabled);
            res.json({
                success: true,
                data: result,
                message: `테스트 타입이 ${enabled ? '활성화' : '비활성화'}되었습니다.`,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TestTypeController = TestTypeController;
//# sourceMappingURL=test-type-controller.js.map