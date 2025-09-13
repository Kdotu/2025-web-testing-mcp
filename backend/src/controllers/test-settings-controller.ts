import { Request, Response } from 'express';
import { TestSettingsService } from '../services/test-settings-service';

export class TestSettingsController {
  private testSettingsService: TestSettingsService;

  constructor() {
    this.testSettingsService = new TestSettingsService();
  }

  /**
   * 모든 테스트 설정 조회
   */
  async getAllSettings(_req: Request, res: Response): Promise<void> {
    try {
      const settings = await this.testSettingsService.getAllSettings();
      
      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('[TestSettings Controller] Get all settings failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 특정 테스트 설정 조회
   */
  async getSettingById(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      console.error('[TestSettings Controller] Get setting by ID failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 새 테스트 설정 생성
   */
  async createSetting(req: Request, res: Response): Promise<void> {
    try {
      const { name, category, value, description, priority, isActive } = req.body;

      // 입력 검증
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
    } catch (error) {
      console.error('[TestSettings Controller] Create setting failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 테스트 설정 업데이트
   */
  async updateSetting(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      console.error('[TestSettings Controller] Update setting failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 테스트 설정 삭제
   */
  async deleteSetting(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      console.error('[TestSettings Controller] Delete setting failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 카테고리별 설정 조회
   */
  async getSettingsByCategory(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      console.error('[TestSettings Controller] Get settings by category failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 설정 검색
   */
  async searchSettings(req: Request, res: Response): Promise<void> {
    try {
      const { q, category, isActive } = req.query;
      
      const searchParams = {
        query: q as string,
        category: category as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
      };

      const settings = await this.testSettingsService.searchSettings(searchParams as any);

      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('[TestSettings Controller] Search settings failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
