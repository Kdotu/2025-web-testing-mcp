import { MCPClientFactory } from './mcp-client-factory';

// MCPClient 인터페이스 정의
interface MCPClient {
  callTool(method: string, params: any): Promise<any>;
  initialize(): Promise<void>;
  close(): Promise<void>;
}
import { LoadTestConfig, E2ETestConfig } from '../types';

export interface MCPTestResult {
  success: boolean;
  data?: any;
  error?: string;
  output?: string;
  logs?: string[];
  metrics?: any;
}

export class MCPServiceWrapper {
  private k6Client: MCPClient;
  private lighthouseClient: MCPClient;
  private playwrightClient: MCPClient;

  constructor() {
    try {
      this.k6Client = MCPClientFactory.createK6Client();
      this.lighthouseClient = MCPClientFactory.createLighthouseClient();
      this.playwrightClient = MCPClientFactory.createPlaywrightClient();
      
      // Playwright 클라이언트 초기화를 비동기로 수행
      this.initializePlaywrightClient();
    } catch (error) {
      console.error('Failed to initialize MCP clients:', error);
      throw error;
    }
  }

  /**
   * Playwright 클라이언트 초기화 (비동기)
   */
  private async initializePlaywrightClient(): Promise<void> {
    try {
      await this.playwrightClient.initialize();
      console.log('[MCP Wrapper] Playwright client initialized successfully');
    } catch (error) {
      console.warn('[MCP Wrapper] Playwright client initialization failed:', error);
    }
  }

  /**
   * k6 테스트 실행
   */
  async executeK6Test(config: LoadTestConfig): Promise<MCPTestResult> {
    try {
      console.log('[MCP Wrapper] Executing k6 test via MCP');
      console.log('[MCP Wrapper] Config:', config);

      const result = await this.k6Client.callTool('execute_k6_test', {
        script_file: config.scriptPath,
        duration: config.duration || '30s',
        vus: config.vus || 10
      });

      console.log('[MCP Wrapper] k6 test result:', result);

      // k6 결과에서 에러 확인 (output 필드 우선 사용)
      const k6Output = result.output || result.result || '';
      const hasNetworkError = k6Output.includes('Error executing k6 test:') || 
                             k6Output.includes('Request Failed') ||
                             k6Output.includes('connectex: A connection attempt failed');
      const hasThresholdError = k6Output.includes('thresholds on metrics') || 
                               k6Output.includes('level=error');
      const hasError = hasNetworkError || hasThresholdError;

      let errorMessage = '';
      if (hasNetworkError) {
        errorMessage = 'k6 test failed: Network connection error';
      } else if (hasThresholdError) {
        errorMessage = 'k6 test failed: Performance thresholds exceeded';
      }

      return {
        success: !hasError,
        data: result,
        output: k6Output,
        metrics: result.metrics,
        ...(hasError && { error: errorMessage })
      };
    } catch (error) {
      console.error('[MCP Wrapper] k6 test execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Lighthouse 테스트 실행
   */
  async executeLighthouseTest(config: any): Promise<MCPTestResult> {
    try {
      console.log('[MCP Wrapper] Executing Lighthouse test via MCP');
      console.log('[MCP Wrapper] Config:', config);

      const result = await this.lighthouseClient.callTool('run_audit', {
        url: config.url,
        device: config.device || 'desktop',
        categories: config.categories || ['performance']
      });

      console.log('[MCP Wrapper] Lighthouse test result:', result);

      return {
        success: true,
        data: result,
        output: result.output,
        metrics: result.metrics
      };
    } catch (error) {
      console.error('[MCP Wrapper] Lighthouse test execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Playwright 테스트 실행 (기존 E2E 테스트)
   */
  async executePlaywrightTest(config: E2ETestConfig): Promise<MCPTestResult> {
    try {
      console.log('[MCP Wrapper] Executing Playwright test via MCP');
      console.log('[MCP Wrapper] Config:', config);

      const result = await this.playwrightClient.callTool('run_test', {
        url: config.url,
        config: config.config || {}
      });

      console.log('[MCP Wrapper] Playwright test result:', result);

      return {
        success: true,
        data: result,
        output: result.output,
        metrics: result.metrics
      };
    } catch (error) {
      console.error('[MCP Wrapper] Playwright test execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Playwright 테스트 시나리오 실행 (사용자 정의 코드)
   */
  async executePlaywrightScenario(scenarioCode: string, config: any = {}): Promise<MCPTestResult> {
    try {
      console.log('[MCP Wrapper] Executing Playwright scenario via MCP');
      console.log('[MCP Wrapper] Scenario code length:', scenarioCode.length);
      console.log('[MCP Wrapper] Config:', config);

      // Playwright 클라이언트 초기화 확인
      try {
        await this.playwrightClient.initialize();
        console.log('[MCP Wrapper] Playwright client initialized successfully');
      } catch (initError) {
        console.warn('[MCP Wrapper] Playwright client initialization failed, continuing anyway:', initError);
      }

      const result = await this.playwrightClient.callTool('execute_scenario', {
        scenarioCode,
        config
      });

      console.log('[MCP Wrapper] Playwright scenario result:', JSON.stringify(result, null, 2));
      
      // logs 내용 상세 로깅
      if (result.logs && Array.isArray(result.logs)) {
        console.log('[MCP Wrapper] Detailed logs:');
        result.logs.forEach((log: any, index: number) => {
          console.log(`[MCP Wrapper] Log ${index + 1}:`, log);
        });
      } else if (result.data?.logs && Array.isArray(result.data.logs)) {
        console.log('[MCP Wrapper] Detailed data.logs:');
        result.data.logs.forEach((log: any, index: number) => {
          console.log(`[MCP Wrapper] Data Log ${index + 1}:`, log);
        });
      } else if (result.result?.data?.logs && Array.isArray(result.result.data.logs)) {
        console.log('[MCP Wrapper] Detailed result.data.logs:');
        result.result.data.logs.forEach((log: any, index: number) => {
          console.log(`[MCP Wrapper] Result Data Log ${index + 1}:`, log);
        });
      } else {
        console.log('[MCP Wrapper] No logs found in result');
        console.log('[MCP Wrapper] Available keys:', Object.keys(result));
        if (result.data) {
          console.log('[MCP Wrapper] Data keys:', Object.keys(result.data));
        }
        if (result.result?.data) {
          console.log('[MCP Wrapper] Result.data keys:', Object.keys(result.result.data));
        }
      }

      // MCP 결과의 data.success를 우선적으로 확인하고, 에러/타임아웃 키워드가 있으면 실패로 간주
      const errMsg = (result.data?.error || result.error || '').toString();
      
      // logs 추출 (여러 경로에서 시도)
      let extractedLogs: string[] = [];
      if (result.logs && Array.isArray(result.logs)) {
        extractedLogs = result.logs;
      } else if (result.data?.logs && Array.isArray(result.data.logs)) {
        extractedLogs = result.data.logs;
      } else if (result.result?.data?.logs && Array.isArray(result.result.data.logs)) {
        extractedLogs = result.result.data.logs;
      }
      
      const logsJoined = extractedLogs.length > 0 ? extractedLogs.join('\n') : (result.output || '');
      const timeoutDetected = /Timeout\s*\d+ms\s*exceeded|ECONNREFUSED|net::ERR|navigation.*timeout/i.test(errMsg) || /Timeout\s*\d+ms\s*exceeded/i.test(logsJoined);
      const isSuccess = result.data?.success !== false && result.success !== false && !timeoutDetected;
      
      return {
        success: isSuccess,
        data: result,
        output: result.output || logsJoined,
        logs: extractedLogs,
        metrics: result.metrics,
        error: result.data?.error || result.error || (timeoutDetected ? 'Navigation timeout or network error detected' : undefined)
      };
    } catch (error) {
      console.error('[MCP Wrapper] Playwright scenario execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 모든 MCP 클라이언트 연결 상태 확인
   */
  async checkConnections(): Promise<{ k6: boolean; lighthouse: boolean; playwright: boolean }> {
    const results = {
      k6: false,
      lighthouse: false,
      playwright: false
    };

    try {
      // k6 연결 확인
      await this.k6Client.initialize();
      results.k6 = true;
    } catch (error) {
      console.error('[MCP Wrapper] k6 client connection failed:', error);
    }

    try {
      // Lighthouse 연결 확인
      await this.lighthouseClient.initialize();
      results.lighthouse = true;
    } catch (error) {
      console.error('[MCP Wrapper] Lighthouse client connection failed:', error);
    }

    try {
      // Playwright 연결 확인
      await this.playwrightClient.initialize();
      results.playwright = true;
    } catch (error) {
      console.error('[MCP Wrapper] Playwright client connection failed:', error);
    }

    return results;
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    try {
      await this.k6Client.close();
      await this.lighthouseClient.close();
      await this.playwrightClient.close();
      console.log('[MCP Wrapper] All MCP clients closed successfully');
    } catch (error) {
      console.error('[MCP Wrapper] Error during cleanup:', error);
    }
  }
} 