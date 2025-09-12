import { Request, Response } from 'express';
import { PlaywrightTestService, PlaywrightTestConfig } from '../services/playwright-test-service';
import { MCPServiceWrapper } from '../services/mcp-service-wrapper';

export class PlaywrightTestController {
  private playwrightService: PlaywrightTestService;

  constructor() {
    this.playwrightService = new PlaywrightTestService();
  }

  /**
   * 테스트 시나리오 실행 (Phase 1-4 전체 플로우)
   */
  async executeTestScenario(req: Request, res: Response): Promise<void> {
    try {
      console.log('[Playwright Controller] Executing test scenario');
      
      const { scenarioCode, config = {}, userId, description } = req.body;

      // 입력 검증
      if (!scenarioCode || typeof scenarioCode !== 'string') {
        res.status(400).json({
          success: false,
          error: 'scenarioCode is required and must be a string'
        });
        return;
      }

      if (scenarioCode.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'scenarioCode cannot be empty'
        });
        return;
      }

      // 설정 검증 및 기본값 설정
      const validatedConfig: PlaywrightTestConfig = {
        browser: config.browser || 'chromium',
        headless: config.headless !== false,
        viewport: config.viewport || { width: 1280, height: 720 },
        timeout: config.timeout || 30000,
        userAgent: config.userAgent
      };

      console.log('[Playwright Controller] Starting test execution flow');
      
      // 전체 테스트 실행 플로우 실행 (Phase 1-4)
      const executionId = await this.playwrightService.executeTestScenarioFlow(
        scenarioCode,
        validatedConfig,
        userId,
        description
      );

      console.log('[Playwright Controller] Test execution flow completed successfully');

      res.status(200).json({
        success: true,
        data: {
          executionId,
          message: 'Test scenario execution started successfully',
          status: 'completed'
        }
      });

    } catch (error) {
      console.error('[Playwright Controller] Test execution failed:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 테스트 실행 상태 조회 (Phase 3 모니터링)
   */
  async getTestExecutionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { executionId } = req.params;

      if (!executionId) {
        res.status(400).json({
          success: false,
          error: 'executionId is required'
        });
        return;
      }

      console.log('[Playwright Controller] Getting test execution status for:', executionId);
      
      const status = await this.playwrightService.getTestExecutionStatus(executionId);
      
      console.log('[Playwright Controller] Status response:', JSON.stringify(status, null, 2));

      res.status(200).json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('[Playwright Controller] Failed to get test execution status:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 테스트 실행 결과 조회 (Phase 4 완료 후)
   */
  async getTestExecutionResult(req: Request, res: Response): Promise<void> {
    try {
      const { executionId } = req.params;

      if (!executionId) {
        res.status(400).json({
          success: false,
          error: 'executionId is required'
        });
        return;
      }

      console.log('[Playwright Controller] Getting test execution result for:', executionId);
      
      const result = await this.playwrightService.getTestExecutionResult(executionId);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Test execution result not found or not completed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[Playwright Controller] Failed to get test execution result:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 테스트 시나리오 검증 (실행 전)
   */
  async validateTestScenario(req: Request, res: Response): Promise<void> {
    try {
      const { scenarioCode } = req.body;

      if (!scenarioCode || typeof scenarioCode !== 'string') {
        res.status(400).json({
          success: false,
          error: 'scenarioCode is required and must be a string'
        });
        return;
      }

      // 기본적인 Playwright 코드 검증
      const validationResult = this.validatePlaywrightCode(scenarioCode);

      res.status(200).json({
        success: true,
        data: validationResult
      });

    } catch (error) {
      console.error('[Playwright Controller] Scenario validation failed:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Playwright 코드 기본 검증
   */
  private validatePlaywrightCode(scenarioCode: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 기본 검증 규칙
    if (scenarioCode.length < 10) {
      errors.push('Scenario code is too short');
    }

    if (scenarioCode.length > 10000) {
      errors.push('Scenario code is too long (max 10,000 characters)');
    }

    // Playwright 관련 키워드 확인
    const playwrightKeywords = ['page', 'browser', 'context', 'await', 'async'];
    const hasPlaywrightElements = playwrightKeywords.some(keyword => 
      scenarioCode.toLowerCase().includes(keyword)
    );

    if (!hasPlaywrightElements) {
      warnings.push('Code may not contain Playwright-specific elements');
    }

    // 잠재적으로 위험한 코드 패턴 확인
    const dangerousPatterns = [
      'eval(',
      'Function(',
      'setTimeout(',
      'setInterval(',
      'process.',
      'require(',
      'import('
    ];

    dangerousPatterns.forEach(pattern => {
      if (scenarioCode.includes(pattern)) {
        errors.push(`Potentially dangerous code pattern detected: ${pattern}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * MCP 서버 상태 확인
   */
  async checkMCPStatus(_req: Request, res: Response): Promise<void> {
    try {
      const mcpWrapper = new MCPServiceWrapper();
      const connections = await mcpWrapper.checkConnections();
      
      res.json({
        success: true,
        data: {
          connections,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[Playwright Controller] MCP status check failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 컨트롤러 정리
   */
  async cleanup(): Promise<void> {
    try {
      await this.playwrightService.cleanup();
      console.log('[Playwright Controller] Cleanup completed successfully');
    } catch (error) {
      console.error('[Playwright Controller] Cleanup failed:', error);
    }
  }
}
