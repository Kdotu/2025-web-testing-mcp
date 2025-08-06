import { join } from 'path';
import { spawn } from 'child_process';

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
  /**
   * 외부 k6 MCP 서버 클라이언트 생성
   * 현재 backend/mcp/k6-mcp-server 활용
   */
  static createExternalK6Client(): MCPClient {
    const config: ExternalMCPServerConfig = {
      command: 'python',
      args: ['k6_server.py'],
      cwd: join(process.cwd(), 'mcp', 'k6-mcp-server'),
      env: {
        ...process.env,
        ['K6_BIN']: process.env['K6_BIN'] || 'k6'
      }
    };
    return new ExternalMCPClient('external-k6', config);
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
    return new ExternalMCPClient('external-lighthouse', config);
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
    return new ExternalMCPClient('external-playwright', config);
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

  constructor(serverName: string, config: ExternalMCPServerConfig) {
    this.serverName = serverName;
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log(`[External MCP Client] Initializing ${this.serverName} client`);
    console.log(`[External MCP Client] Command: ${this.config.command} ${this.config.args.join(' ')}`);
    console.log(`[External MCP Client] CWD: ${this.config.cwd}`);
  }

  async callTool(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`[External MCP Client] Calling ${method} on ${this.serverName}`);

      const childProcess = spawn(this.config.command, this.config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.config.cwd,
        env: this.config.env
      });

      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      childProcess.on('close', (code: number) => {
        if (code === 0) {
          try {
            const response = JSON.parse(output);
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${output}`));
          }
        } else {
          reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
        }
      });

      childProcess.on('error', (error: Error) => {
        reject(error);
      });

      const request = { method, params };
      childProcess.stdin.write(JSON.stringify(request) + '\n');
      childProcess.stdin.end();
    });
  }

  async close(): Promise<void> {
    console.log(`[External MCP Client] Closing ${this.serverName} client`);
  }
}

// 기존 SimpleMCPClient (로컬 서버용)
class SimpleMCPClient implements MCPClient {
  private serverPath: string;
  private serverName: string;

  constructor(serverName: string, serverPath: string) {
    this.serverName = serverName;
    this.serverPath = serverPath;
  }

  async initialize(): Promise<void> {
    console.log(`[Local MCP Client] Initializing ${this.serverName} client`);
  }

  async callTool(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`[Local MCP Client] Calling ${method} on ${this.serverName}`);
      
      const isWindows = global.process.platform === 'win32';
      const isPythonFile = this.serverPath.endsWith('.py');
      const isTypeScriptFile = this.serverPath.endsWith('.ts');
      
      let childProcess;
      
      if (isPythonFile) {
        // Python 경로 결정 (여러 가능한 경로 시도)
        const possiblePythonPaths = [
          process.env['PYTHON_PATH'],
          '/usr/bin/python3',
          '/usr/bin/python',
          'python3',
          'python'
        ].filter(Boolean);
        
        let pythonPath = possiblePythonPaths[0] || 'python3';
        
        // 실제로 존재하는 Python 경로 찾기
        for (const path of possiblePythonPaths) {
          if (!path) continue;
          try {
            const { execSync } = require('child_process');
            execSync(`${path} --version`, { stdio: 'ignore' });
            pythonPath = path;
            break;
          } catch (error) {
            // 이 경로는 사용할 수 없음, 다음 경로 시도
            continue;
          }
        }
        
        console.log(`[Local MCP Client] Using Python path: ${pythonPath}`);
        
        childProcess = spawn(pythonPath, [this.serverPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            // Python 관련 환경변수 설정
            PYTHONPATH: process.env['PYTHONPATH'] || '',
            PYTHONUNBUFFERED: '1',
            PYTHON_PATH: pythonPath
          }
        });
      } else if (isTypeScriptFile) {
        childProcess = isWindows 
          ? spawn('cmd', ['/c', 'npx', 'ts-node', this.serverPath], {
              stdio: ['pipe', 'pipe', 'pipe'],
              env: process.env
            })
          : spawn('npx', ['ts-node', this.serverPath], {
              stdio: ['pipe', 'pipe', 'pipe'],
              env: process.env
            });
      } else {
        childProcess = spawn('node', [this.serverPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env
        });
      }

      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      childProcess.on('close', (code: number) => {
        if (code === 0) {
          try {
            const response = JSON.parse(output);
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${output}`));
          }
        } else {
          reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
        }
      });

      childProcess.on('error', (error: Error) => {
        reject(error);
      });

      const request = { method, params };
      childProcess.stdin.write(JSON.stringify(request) + '\n');
      childProcess.stdin.end();
    });
  }

  async close(): Promise<void> {
    console.log(`[Local MCP Client] Closing ${this.serverName} client`);
  }
} 