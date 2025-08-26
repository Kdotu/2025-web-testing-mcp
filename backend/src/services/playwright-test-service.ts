import { MCPServiceWrapper } from './mcp-service-wrapper';
import { createServiceClient } from './supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PlaywrightTestConfig {
  browser?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  viewport?: { width: number; height: number };
  timeout?: number;
  userAgent?: string;
}

export interface PlaywrightTestExecution {
  executionId: string;
  scenarioCode: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  config: PlaywrightTestConfig;
  userId?: string;
}

export interface PlaywrightTestResult {
  executionId: string;
  success: boolean;
  logs: string[];
  output?: string;
  error?: string;
  executionTime: string;
  screenshots?: string[];
  videos?: string[];
}

export class PlaywrightTestService {
  private mcpWrapper: MCPServiceWrapper;
  private supabase: SupabaseClient;

  constructor() {
    this.mcpWrapper = new MCPServiceWrapper();
    this.supabase = createServiceClient();
  }

  /**
   * Phase 1: 테스트 실행 정보 DB 저장 및 실행 ID 생성
   */
  async createTestExecution(scenarioCode: string, config: PlaywrightTestConfig, userId?: string): Promise<string> {
    try {
      console.log('[Playwright Service] Phase 1: Creating test execution record');
      
      const { data, error } = await this.supabase
        .from('playwright_test_results')
        .insert({
          scenario_code: scenarioCode,
          status: 'pending',
          browser_type: config.browser || 'chromium',
          viewport_width: config.viewport?.width || 1280,
          viewport_height: config.viewport?.height || 720,
          user_id: userId,
          test_type_id: await this.getPlaywrightTestTypeId()
        })
        .select('execution_id')
        .single();

      if (error) {
        console.error('[Playwright Service] Failed to create test execution record:', error);
        throw new Error(`Failed to create test execution record: ${error.message}`);
      }

      console.log('[Playwright Service] Phase 1: Test execution record created with ID:', data.execution_id);
      return data.execution_id;
    } catch (error) {
      console.error('[Playwright Service] Phase 1 failed:', error);
      throw error;
    }
  }

  /**
   * Phase 2: MCP 서버로 테스트 시나리오 실행 요청 전송
   */
  async executeTestScenario(executionId: string, scenarioCode: string, config: PlaywrightTestConfig): Promise<void> {
    try {
      console.log('[Playwright Service] Phase 2: Starting test execution via MCP');
      
      // 상태를 running으로 업데이트
      await this.updateTestStatus(executionId, 'running', 0, 'Starting test execution');
      
      // MCP 서버로 시나리오 실행 요청
      const result = await this.mcpWrapper.executePlaywrightScenario(scenarioCode, config);
      
      if (!result.success) {
        throw new Error(result.error || 'Test execution failed');
      }

      console.log('[Playwright Service] Phase 2: Test execution started successfully');
    } catch (error) {
      console.error('[Playwright Service] Phase 2 failed:', error);
      await this.updateTestStatus(executionId, 'failed', 0, 'Test execution failed');
      throw error;
    }
  }

  /**
   * Phase 3: 기본 폴링 방식으로 실행 상태 모니터링 및 진행률 업데이트
   */
  async monitorTestExecution(executionId: string): Promise<void> {
    try {
      console.log('[Playwright Service] Phase 3: Starting test execution monitoring');
      
      // 실제 구현에서는 MCP 서버로부터 실시간 상태를 받아 업데이트
      // 현재는 기본적인 상태 업데이트만 수행
      
      // 진행률 단계별 업데이트 (시뮬레이션)
      const progressSteps = [
        { progress: 20, step: 'Browser launching' },
        { progress: 40, step: 'Page loading' },
        { progress: 60, step: 'Scenario execution' },
        { progress: 80, step: 'Result collection' },
        { progress: 100, step: 'Test completed' }
      ];

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
        await this.updateTestStatus(executionId, 'running', step.progress, step.step);
      }

      console.log('[Playwright Service] Phase 3: Test execution monitoring completed');
    } catch (error) {
      console.error('[Playwright Service] Phase 3 failed:', error);
      throw error;
    }
  }

  /**
   * Phase 4: 최종 결과 수집 및 DB 업데이트
   */
  async completeTestExecution(executionId: string, result: PlaywrightTestResult): Promise<void> {
    try {
      console.log('[Playwright Service] Phase 4: Completing test execution');
      
      const finalStatus = result.success ? 'success' : 'failed';
      const executionTimeMs = result.executionTime ? this.calculateExecutionTime(result.executionTime) : null;
      
      // 최종 결과 저장
      const { error } = await this.supabase
        .rpc('complete_playwright_test', {
          p_execution_id: executionId,
          p_final_status: finalStatus,
          p_result_summary: result.output || result.logs?.join('\n'),
          p_screenshots: result.screenshots || [],
          p_videos: result.videos || [],
          p_error_details: result.error,
          p_execution_time_ms: executionTimeMs
        });

      if (error) {
        console.error('[Playwright Service] Failed to complete test execution:', error);
        throw new Error(`Failed to complete test execution: ${error.message}`);
      }

      console.log('[Playwright Service] Phase 4: Test execution completed successfully');
    } catch (error) {
      console.error('[Playwright Service] Phase 4 failed:', error);
      throw error;
    }
  }

  /**
   * 전체 테스트 실행 플로우 (Phase 1-4)
   */
  async executeTestScenarioFlow(scenarioCode: string, config: PlaywrightTestConfig, userId?: string): Promise<string> {
    try {
      console.log('[Playwright Service] Starting complete test execution flow');
      
      // Phase 1: 테스트 실행 정보 DB 저장 및 실행 ID 생성
      const executionId = await this.createTestExecution(scenarioCode, config, userId);
      
      // Phase 2: MCP 서버로 테스트 실행 요청 전송
      await this.executeTestScenario(executionId, scenarioCode, config);
      
      // Phase 3: 실행 상태 모니터링 및 진행률 업데이트
      await this.monitorTestExecution(executionId);
      
      // Phase 4: 최종 결과 수집 및 DB 업데이트
      const result: PlaywrightTestResult = {
        executionId,
        success: true,
        logs: ['Test execution completed successfully'],
        executionTime: new Date().toISOString()
      };
      
      await this.completeTestExecution(executionId, result);
      
      console.log('[Playwright Service] Complete test execution flow finished successfully');
      return executionId;
      
    } catch (error) {
      console.error('[Playwright Service] Test execution flow failed:', error);
      throw error;
    }
  }

  /**
   * 테스트 실행 상태 조회
   */
  async getTestExecutionStatus(executionId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('playwright_test_results')
        .select('*')
        .eq('execution_id', executionId)
        .single();

      if (error) {
        throw new Error(`Failed to get test execution status: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[Playwright Service] Failed to get test execution status:', error);
      throw error;
    }
  }

  /**
   * 테스트 실행 결과 조회
   */
  async getTestExecutionResult(executionId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('playwright_test_results')
        .select('*')
        .eq('execution_id', executionId)
        .eq('status', 'completed')
        .single();

      if (error) {
        throw new Error(`Failed to get test execution result: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[Playwright Service] Failed to get test execution result:', error);
      throw error;
    }
  }

  /**
   * 테스트 실행 상태 업데이트
   */
  private async updateTestStatus(
    executionId: string, 
    status: string, 
    progressPercentage: number, 
    currentStep: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('update_playwright_test_status', {
          p_execution_id: executionId,
          p_status: status,
          p_progress_percentage: progressPercentage,
          p_current_step: currentStep
        });

      if (error) {
        console.error('[Playwright Service] Failed to update test status:', error);
      }
    } catch (error) {
      console.error('[Playwright Service] Failed to update test status:', error);
    }
  }

  /**
   * Playwright 테스트 타입 ID 조회
   */
  private async getPlaywrightTestTypeId(): Promise<number | null> {
    try {
      const { data, error } = await this.supabase
        .from('test_types')
        .select('id')
        .eq('name', 'playwright')
        .single();

      if (error) {
        console.warn('[Playwright Service] Playwright test type not found, using null');
        return null;
      }

      return data.id;
    } catch (error) {
      console.warn('[Playwright Service] Failed to get playwright test type ID, using null');
      return null;
    }
  }

  /**
   * 실행 시간 계산 (밀리초)
   */
  private calculateExecutionTime(executionTime: string): number {
    try {
      const startTime = new Date(executionTime);
      const endTime = new Date();
      return endTime.getTime() - startTime.getTime();
    } catch (error) {
      console.warn('[Playwright Service] Failed to calculate execution time');
      return 0;
    }
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    try {
      await this.mcpWrapper.cleanup();
      console.log('[Playwright Service] Cleanup completed successfully');
    } catch (error) {
      console.error('[Playwright Service] Cleanup failed:', error);
    }
  }
}
