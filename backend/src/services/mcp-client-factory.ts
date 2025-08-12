import { join } from 'path';
import { MCPProcessManager } from '../services/mcp-process-manager';

// MCP 클라이언트 인터페이스
interface MCPClient {
  callTool(method: string, params: any): Promise<any>;
  initialize(): Promise<void>;
  close(): Promise<void>;
}

// 외부 MCP 서버 설정 인터페이스
interface ExternalMCPServerConfig {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export class MCPClientFactory {
  private static processManager: MCPProcessManager | null = null;

  static getProcessManager(): MCPProcessManager {
    if (!this.processManager) {
      this.processManager = new MCPProcessManager();
    }
    return this.processManager;
  }

  /**
   * 외부 k6 MCP 서버 클라이언트 생성
   * 현재 backend/mcp/k6-mcp-server 활용
   */
  static createExternalK6Client(): MCPClient {
    const config: ExternalMCPServerConfig = {
      command: process.platform === 'win32' ? 'python' : 'python3',
      args: ['k6_server.py'],
      cwd: join(process.cwd(), 'mcp', 'k6-mcp-server'),
      env: {
        ...process.env,
        ['K6_BIN']: process.env['K6_BIN'] || 'k6',
        ['PYTHON_PATH']: process.env['PYTHON_PATH'] || (process.platform === 'win32' ? 'python' : 'python3')
      }
    };
    return new ExternalMCPClient('external-k6', config, this.getProcessManager());
  }

  /**
   * 로컬 k6 MCP 클라이언트 생성 (기존 방식)
   */
  static createLocalK6Client(): MCPClient {
    return new SimpleMCPClient('local-k6', join(process.cwd(), 'mcp', 'k6-mcp-server', 'k6_server.py'));
  }

  /**
   * k6 MCP 클라이언트 생성 (외부 우선, 실패시 로컬)
   */
  static createK6Client(): MCPClient {
    try {
      // 외부 서버 먼저 시도
      return this.createExternalK6Client();
    } catch (error) {
      console.log('[MCP Client] External k6 server not available, using local server');
      return this.createLocalK6Client();
    }
  }

  /**
   * 외부 Lighthouse MCP 서버 클라이언트 생성
   * 현재 backend/mcp/lighthouse-mcp-server 활용
   */
  static createExternalLighthouseClient(): MCPClient {
    const config: ExternalMCPServerConfig = {
      command: 'node',
      args: ['lighthouse_server.js'],
      cwd: join(process.cwd(), 'mcp', 'lighthouse-mcp-server'),
      env: {
        ...process.env,
        ['LIGHTHOUSE_BIN']: process.env['LIGHTHOUSE_BIN'] || 'npx lighthouse'
      }
    };
    return new ExternalMCPClient('external-lighthouse', config, this.getProcessManager());
  }

  /**
   * 로컬 Lighthouse MCP 클라이언트 생성
   */
  static createLocalLighthouseClient(): MCPClient {
    return new SimpleMCPClient('local-lighthouse', join(process.cwd(), 'mcp', 'lighthouse-mcp-server', 'lighthouse_server.js'));
  }

  /**
   * Lighthouse MCP 클라이언트 생성 (외부 우선, 실패시 로컬)
   */
  static createLighthouseClient(): MCPClient {
    try {
      return this.createExternalLighthouseClient();
    } catch (error) {
      console.log('[MCP Client] External lighthouse server not available, using local server');
      return this.createLocalLighthouseClient();
    }
  }

  /**
   * 외부 Playwright MCP 서버 클라이언트 생성
   * 현재 backend/mcp/playwright-mcp-server 활용
   */
  static createExternalPlaywrightClient(): MCPClient {
    const config: ExternalMCPServerConfig = {
      command: 'node',
      args: ['playwright_server.js'],
      cwd: join(process.cwd(), 'mcp', 'playwright-mcp-server'),
      env: {
        ...process.env,
        ['PLAYWRIGHT_BIN']: process.env['PLAYWRIGHT_BIN'] || 'npx playwright'
      }
    };
    return new ExternalMCPClient('external-playwright', config, this.getProcessManager());
  }

  /**
   * 로컬 Playwright MCP 클라이언트 생성
   */
  static createLocalPlaywrightClient(): MCPClient {
    return new SimpleMCPClient('local-playwright', join(process.cwd(), 'mcp', 'playwright-mcp-server', 'playwright_server.js'));
  }

  /**
   * Playwright MCP 클라이언트 생성 (외부 우선, 실패시 로컬)
   */
  static createPlaywrightClient(): MCPClient {
    try {
      return this.createExternalPlaywrightClient();
    } catch (error) {
      console.log('[MCP Client] External playwright server not available, using local server');
      return this.createLocalPlaywrightClient();
    }
  }

  /**
   * 모든 MCP 클라이언트 생성 (외부 우선)
   */
  static createAllClients() {
    return {
      k6: this.createK6Client(),
      lighthouse: this.createLighthouseClient(),
      playwright: this.createPlaywrightClient()
    };
  }

  /**
   * 외부 MCP 서버 상태 확인
   */
  static async checkExternalServers(): Promise<{
    k6: boolean;
    lighthouse: boolean;
    playwright: boolean;
  }> {
    const results = {
      k6: false,
      lighthouse: false,
      playwright: false
    };

    try {
      const k6Client = this.createExternalK6Client();
      await k6Client.initialize();
      await k6Client.close();
      results.k6 = true;
    } catch (error) {
      console.log('[MCP Client] External k6 server not available');
    }

    try {
      const lighthouseClient = this.createExternalLighthouseClient();
      await lighthouseClient.initialize();
      await lighthouseClient.close();
      results.lighthouse = true;
    } catch (error) {
      console.log('[MCP Client] External lighthouse server not available');
    }

    try {
      const playwrightClient = this.createExternalPlaywrightClient();
      await playwrightClient.initialize();
      await playwrightClient.close();
      results.playwright = true;
    } catch (error) {
      console.log('[MCP Client] External playwright server not available');
    }

    return results;
  }
}

// 외부 MCP 서버 클라이언트 구현
class ExternalMCPClient implements MCPClient {
  private serverName: string;
  private config: ExternalMCPServerConfig;
  private processManager: MCPProcessManager;
  private processId: string | null = null;

  constructor(serverName: string, config: ExternalMCPServerConfig, processManager: MCPProcessManager) {
    this.serverName = serverName;
    this.config = config;
    this.processManager = processManager;
  }

  async initialize(): Promise<void> {
    console.log(`[External MCP Client] Initializing ${this.serverName} client`);
    
    try {
      // 프로세스 매니저를 통해 서버 시작
      this.processId = await this.processManager.startServer({
        name: this.serverName,
        command: this.config.command,
        args: this.config.args,
        cwd: this.config.cwd || process.cwd(),
        env: this.config.env || process.env
      });
      
      console.log(`[External MCP Client] ${this.serverName} client initialized with process ID: ${this.processId}`);
    } catch (error) {
      console.error(`[External MCP Client] Failed to initialize ${this.serverName} client:`, error);
      throw error;
    }
  }

  async callTool(method: string, params: any): Promise<any> {
    try {
      // 프로세스가 실행 중이 아니면 시작
      if (!this.processId) {
        await this.initialize();
      }

      // 프로세스 매니저를 통해 통신
      const result = await this.processManager.executeCommand(this.processId!, method, params);
      return result;
    } catch (error) {
      console.error(`[External MCP Client] Error calling ${method} on ${this.serverName}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    console.log(`[External MCP Client] Closing ${this.serverName} client`);
    
    if (this.processId) {
      try {
        await this.processManager.stopServer(this.processId);
        this.processId = null;
        console.log(`[External MCP Client] ${this.serverName} client closed successfully`);
      } catch (error) {
        console.error(`[External MCP Client] Error closing ${this.serverName} client:`, error);
      }
    }
  }
}

// 기존 SimpleMCPClient (로컬 서버용)
class SimpleMCPClient implements MCPClient {
  private serverPath: string;
  private serverName: string;
  private processManager: MCPProcessManager;
  private processId: string | null = null;

  constructor(serverName: string, serverPath: string) {
    this.serverName = serverName;
    this.serverPath = serverPath;
    this.processManager = MCPClientFactory.getProcessManager();
  }

  async initialize(): Promise<void> {
    console.log(`[Local MCP Client] Initializing ${this.serverName} client`);
    
    try {
      const isPythonFile = this.serverPath.endsWith('.py');
      const isTypeScriptFile = this.serverPath.endsWith('.ts');
      
      let command: string;
      let args: string[];
      
      if (isPythonFile) {
        // Python 경로 결정
        const pythonPath = process.env['PYTHON_PATH'] || 'python3';
        command = pythonPath;
        args = [this.serverPath];
      } else if (isTypeScriptFile) {
        const isWindows = global.process.platform === 'win32';
        if (isWindows) {
          command = 'cmd';
          args = ['/c', 'npx', 'ts-node', this.serverPath];
        } else {
          command = 'npx';
          args = ['ts-node', this.serverPath];
        }
      } else {
        command = 'node';
        args = [this.serverPath];
      }
      
      // 프로세스 매니저를 통해 서버 시작
      this.processId = await this.processManager.startServer({
        name: this.serverName,
        command,
        args,
        cwd: process.cwd(),
        env: process.env
      });
      
      console.log(`[Local MCP Client] ${this.serverName} client initialized with process ID: ${this.processId}`);
    } catch (error) {
      console.error(`[Local MCP Client] Failed to initialize ${this.serverName} client:`, error);
      throw error;
    }
  }

  async callTool(method: string, params: any): Promise<any> {
    if (!this.processId) {
      throw new Error('Client not initialized');
    }
    
    try {
      return await this.processManager.executeCommand(this.processId, method, params);
    } catch (error) {
      console.error(`[Local MCP Client] Error calling ${method} on ${this.serverName}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    console.log(`[Local MCP Client] Closing ${this.serverName} client`);
    
    if (this.processId) {
      try {
        await this.processManager.stopServer(this.processId);
        this.processId = null;
        console.log(`[Local MCP Client] ${this.serverName} client closed successfully`);
      } catch (error) {
        console.error(`[Local MCP Client] Error closing ${this.serverName} client:`, error);
      }
    }
  }
} 