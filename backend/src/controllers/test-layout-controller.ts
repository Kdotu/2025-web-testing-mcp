import { Request, Response } from 'express';
import { TestLayoutService } from '../services/test-layout-service';

export class TestLayoutController {
  private testLayoutService: TestLayoutService;

  constructor() {
    this.testLayoutService = new TestLayoutService();
  }

  /**
   * 모든 레이아웃 조회
   */
  async getAllLayouts(_req: Request, res: Response): Promise<void> {
    try {
      const layouts = await this.testLayoutService.getAllLayouts();
      
      res.status(200).json({
        success: true,
        data: layouts
      });
    } catch (error) {
      console.error('[TestLayout Controller] Get all layouts failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 테스트 타입별 레이아웃 조회
   */
  async getLayoutsByTestType(req: Request, res: Response): Promise<void> {
    try {
      const { testType } = req.params;
      if (!testType) {
        res.status(400).json({
          success: false,
          error: 'Test type parameter is required'
        });
        return;
      }

      const layouts = await this.testLayoutService.getLayoutsByTestType(testType);
      
      res.status(200).json({
        success: true,
        data: layouts
      });
    } catch (error) {
      console.error('[TestLayout Controller] Get layouts by test type failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 특정 레이아웃 조회
   */
  async getLayoutById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID parameter is required'
        });
        return;
      }

      const layout = await this.testLayoutService.getLayoutById(parseInt(id));
      
      if (!layout) {
        res.status(404).json({
          success: false,
          error: 'Layout not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: layout
      });
    } catch (error) {
      console.error('[TestLayout Controller] Get layout by ID failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 새 레이아웃 생성
   */
  async createLayout(req: Request, res: Response): Promise<void> {
    try {
      const { testType, name, description, isDefault, isActive, createdBy } = req.body;

      // 입력 검증
      if (!testType || !name) {
        res.status(400).json({
          success: false,
          error: 'testType and name are required'
        });
        return;
      }

      const layoutData = {
        testType,
        name,
        description: description || '',
        isDefault: isDefault || false,
        isActive: isActive !== false,
        createdBy: createdBy || 'system'
      };

      const newLayout = await this.testLayoutService.createLayout(layoutData);

      res.status(201).json({
        success: true,
        data: newLayout
      });
    } catch (error) {
      console.error('[TestLayout Controller] Create layout failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 레이아웃 업데이트
   */
  async updateLayout(req: Request, res: Response): Promise<void> {
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
      const updatedLayout = await this.testLayoutService.updateLayout(parseInt(id), updateData);

      if (!updatedLayout) {
        res.status(404).json({
          success: false,
          error: 'Layout not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedLayout
      });
    } catch (error) {
      console.error('[TestLayout Controller] Update layout failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 레이아웃 삭제
   */
  async deleteLayout(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID parameter is required'
        });
        return;
      }

      const deleted = await this.testLayoutService.deleteLayout(parseInt(id));

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Layout not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Layout deleted successfully'
      });
    } catch (error) {
      console.error('[TestLayout Controller] Delete layout failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 섹션 생성
   */
  async createSection(req: Request, res: Response): Promise<void> {
    try {
      const { layoutId, sectionName, sectionTitle, sectionDescription, sectionOrder, isCollapsible, isExpanded } = req.body;

      // 입력 검증
      if (!layoutId || !sectionName || !sectionTitle || sectionOrder === undefined) {
        res.status(400).json({
          success: false,
          error: 'layoutId, sectionName, sectionTitle, and sectionOrder are required'
        });
        return;
      }

      const sectionData = {
        layoutId,
        sectionName,
        sectionTitle,
        sectionDescription: sectionDescription || '',
        sectionOrder,
        isCollapsible: isCollapsible || false,
        isExpanded: isExpanded !== false
      };

      const newSection = await this.testLayoutService.createSection(sectionData);

      res.status(201).json({
        success: true,
        data: newSection
      });
    } catch (error) {
      console.error('[TestLayout Controller] Create section failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 필드 생성
   */
  async createField(req: Request, res: Response): Promise<void> {
    try {
      const { 
        layoutId, 
        sectionId, 
        fieldName, 
        fieldType, 
        label, 
        placeholder, 
        description, 
        isRequired, 
        isVisible, 
        fieldOrder, 
        fieldWidth, 
        defaultValue, 
        validationRules, 
        options, 
        conditionalLogic 
      } = req.body;

      // 입력 검증
      if (!layoutId || !sectionId || !fieldName || !fieldType || !label || fieldOrder === undefined) {
        res.status(400).json({
          success: false,
          error: 'layoutId, sectionId, fieldName, fieldType, label, and fieldOrder are required'
        });
        return;
      }

      const fieldData = {
        layoutId,
        sectionId,
        fieldName,
        fieldType,
        label,
        placeholder: placeholder || '',
        description: description || '',
        isRequired: isRequired || false,
        isVisible: isVisible !== false,
        fieldOrder,
        fieldWidth: fieldWidth || 'full',
        defaultValue: defaultValue || '',
        validationRules: validationRules || null,
        options: options || null,
        conditionalLogic: conditionalLogic || null
      };

      const newField = await this.testLayoutService.createField(fieldData);

      res.status(201).json({
        success: true,
        data: newField
      });
    } catch (error) {
      console.error('[TestLayout Controller] Create field failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
