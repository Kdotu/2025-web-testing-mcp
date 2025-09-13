import { Request, Response } from 'express';
import { DynamicSettingsService } from '../services/dynamic-settings-service';

export class DynamicSettingsController {
  private dynamicSettingsService: DynamicSettingsService;

  constructor() {
    this.dynamicSettingsService = new DynamicSettingsService();
  }

  // 레이아웃 기반 설정 폼 생성
  public generateSettingsForm = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.dynamicSettingsService.generateSettingsForm(testType, layoutId as string);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error generating settings form:', error);
      res.status(500).json({
        success: false,
        error: '설정 폼 생성 중 오류가 발생했습니다.'
      });
    }
  };

  // 필드 유효성 검사
  public validateField = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
      console.error('Error validating field:', error);
      res.status(500).json({
        success: false,
        error: '필드 유효성 검사 중 오류가 발생했습니다.'
      });
    }
  };

  // 설정값 저장
  public saveSettings = async (req: Request, res: Response): Promise<void> => {
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
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      res.status(500).json({
        success: false,
        error: '설정값 저장 중 오류가 발생했습니다.'
      });
    }
  };

  // 설정값 로드
  public loadSettings = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.dynamicSettingsService.loadSettings(testType, layoutId as string);
      res.json(result);
    } catch (error) {
      console.error('Error loading settings:', error);
      res.status(500).json({
        success: false,
        error: '설정값 로드 중 오류가 발생했습니다.'
      });
    }
  };

  // 설정값 검증 (전체 폼)
  public validateSettings = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
      console.error('Error validating settings:', error);
      res.status(500).json({
        success: false,
        error: '설정값 검증 중 오류가 발생했습니다.'
      });
    }
  };

  // 테스트 실행을 위한 설정값 변환
  public convertToTestConfig = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
      console.error('Error converting to test config:', error);
      res.status(500).json({
        success: false,
        error: '테스트 설정 변환 중 오류가 발생했습니다.'
      });
    }
  };
}
