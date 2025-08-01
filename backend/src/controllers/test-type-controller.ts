import { Request, Response, NextFunction } from 'express';
import { TestTypeService, TestType } from '../services/test-type-service';
import { createValidationError } from '../middleware/error-handler';

export class TestTypeController {
  private testTypeService: TestTypeService;

  constructor() {
    this.testTypeService = new TestTypeService();
  }

  /**
   * 모든 테스트 타입 조회
   */
  async getAllTestTypes(_req: Request, res: Response, next: NextFunction) {
    try {
      const testTypes = await this.testTypeService.getAllTestTypes();
      
      res.json({
        success: true,
        data: testTypes,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 활성화된 테스트 타입만 조회
   */
  async getEnabledTestTypes(_req: Request, res: Response, next: NextFunction) {
    try {
      const testTypes = await this.testTypeService.getEnabledTestTypes();
      
      res.json({
        success: true,
        data: testTypes,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 테스트 타입 추가
   */
  async addTestType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, name, description, enabled, category, icon, color, config_template, mcp_tool } = req.body;

      // 기본 검증
      if (!id || !name) {
        throw createValidationError('ID와 이름은 필수입니다.');
      }

      const newTestType: Omit<TestType, 'created_at' | 'updated_at'> = {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * 테스트 타입 수정
   */
  async updateTestType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id) {
        throw createValidationError('테스트 타입 ID가 필요합니다.');
      }

      const result = await this.testTypeService.updateTestType(id, updates);
      
      res.json({
        success: true,
        data: result,
        message: '테스트 타입이 수정되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 테스트 타입 삭제
   */
  async deleteTestType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        throw createValidationError('테스트 타입 ID가 필요합니다.');
      }

      await this.testTypeService.deleteTestType(id);
      
      res.json({
        success: true,
        message: '테스트 타입이 삭제되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 테스트 타입 활성화/비활성화 토글
   */
  async toggleTestType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      if (!id) {
        throw createValidationError('테스트 타입 ID가 필요합니다.');
      }

      if (typeof enabled !== 'boolean') {
        throw createValidationError('enabled 값은 boolean이어야 합니다.');
      }

      const result = await this.testTypeService.toggleTestType(id, enabled);
      
      res.json({
        success: true,
        data: result,
        message: `테스트 타입이 ${enabled ? '활성화' : '비활성화'}되었습니다.`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 기본 테스트 타입 초기화
   */
  async initializeDefaultTestTypes(_req: Request, res: Response, next: NextFunction) {
    try {
      await this.testTypeService.initializeDefaultTestTypes();
      
      res.json({
        success: true,
        message: '기본 테스트 타입이 초기화되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
} 