import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// MCP 서버 프로세스 정보 인터페이스
interface MCPProcessInfo {
  id: string;
  name: string;
  process: ChildProcess;
  startTime: Date;
  lastActivity: Date;
  isHealthy: boolean;
  restartCount: number;
  maxRestarts: number;
}

// MCP 서버 설정 인터페이스
interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  healthCheckInterval?: number;
  maxRestarts?: number;
  timeout?: number;
}

export class MCPProcessManager extends EventEmitter {
  private processes: Map<string, MCPProcessInfo> = new Map();
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFAULT_HEALTH_CHECK_INTERVAL = 30000; // 30초
  private readonly DEFAULT_MAX_RESTARTS = 3;
  private readonly DEFAULT_TIMEOUT = 60000; // 60초

  constructor() {
    super();
    this.setupProcessCleanup();
  }

  /**
   * MCP 서버 프로세스 시작
   */
  async startServer(config: MCPServerConfig): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const processId = `${config.name}-${timestamp}-${random}`;
    
    try {
      // 이미 실행 중인 동일한 서버가 있는지 확인
      if (this.isServerRunning(config.name)) {
        console.log(`[MCP Process Manager] Server ${config.name} is already running`);
        const existingId = this.getRunningServerId(config.name);
        if (existingId) {
          return existingId;
        }
      }

      console.log(`[MCP Process Manager] Starting ${config.name} server...`);
      
      const childProcess = spawn(config.command, config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: config.cwd,
        env: {
          ...process.env,
          ...config.env,
          MCP_SERVER_ID: processId
        }
      });

      const processInfo: MCPProcessInfo = {
        id: processId,
        name: config.name,
        process: childProcess,
        startTime: new Date(),
        lastActivity: new Date(),
        isHealthy: true,
        restartCount: 0,
        maxRestarts: config.maxRestarts || this.DEFAULT_MAX_RESTARTS
      };

      // 프로세스 이벤트 리스너 설정
      this.setupProcessEventListeners(processInfo);
      
      // 프로세스 맵에 추가
      this.processes.set(processId, processInfo);
      
      // 헬스 체크 시작
      this.startHealthCheck(processId, config.healthCheckInterval || this.DEFAULT_HEALTH_CHECK_INTERVAL);
      
      // 프로세스 시작 완료 대기
      await this.waitForProcessStart(childProcess, config.timeout || this.DEFAULT_TIMEOUT);
      
      console.log(`[MCP Process Manager] Server ${config.name} started successfully with ID: ${processId}`);
      this.emit('serverStarted', { processId, name: config.name });
      
      return processId;
    } catch (error) {
      console.error(`[MCP Process Manager] Failed to start server ${config.name}:`, error);
      this.emit('serverStartFailed', { name: config.name, error });
      throw error;
    }
  }

  /**
   * MCP 서버 프로세스 중지
   */
  async stopServer(processId: string): Promise<boolean> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      console.log(`[MCP Process Manager] Process ${processId} not found`);
      return false;
    }

    try {
      console.log(`[MCP Process Manager] Stopping server ${processInfo.name}...`);
      
      // 헬스 체크 타이머 정리
      this.stopHealthCheck(processId);
      
      // 프로세스 정상 종료 시도
      await this.gracefullyKillProcess(processInfo.process);
      
      // 프로세스 정보 제거
      this.processes.delete(processId);
      
      console.log(`[MCP Process Manager] Server ${processInfo.name} stopped successfully`);
      this.emit('serverStopped', { processId, name: processInfo.name });
      
      return true;
    } catch (error) {
      console.error(`[MCP Process Manager] Error stopping server ${processInfo.name}:`, error);
      this.emit('serverStopFailed', { processId, name: processInfo.name, error });
      return false;
    }
  }

  /**
   * 모든 MCP 서버 프로세스 중지
   */
  async stopAllServers(): Promise<void> {
    console.log(`[MCP Process Manager] Stopping all servers...`);
    
    const stopPromises = Array.from(this.processes.keys()).map(processId => 
      this.stopServer(processId)
    );
    
    await Promise.allSettled(stopPromises);
    console.log(`[MCP Process Manager] All servers stopped`);
  }

  /**
   * 서버 상태 확인
   */
  getServerStatus(processId: string): MCPProcessInfo | null {
    return this.processes.get(processId) || null;
  }

  /**
   * 모든 서버 상태 확인
   */
  getAllServerStatuses(): MCPProcessInfo[] {
    return Array.from(this.processes.values());
  }

  /**
   * 서버가 실행 중인지 확인 (프로세스 상태도 검증)
   */
  isServerRunning(serverName: string): boolean {
    return Array.from(this.processes.values()).some(info => 
      info.name === serverName && 
      info.process && 
      !info.process.killed && 
      info.isHealthy
    );
  }

  /**
   * 실행 중인 서버 ID 가져오기 (프로세스 상태도 검증)
   */
  getRunningServerId(serverName: string): string | null {
    const processInfo = Array.from(this.processes.values()).find(info => 
      info.name === serverName && 
      info.process && 
      !info.process.killed && 
      info.isHealthy
    );
    return processInfo?.id || null;
  }

  /**
   * 프로세스 이벤트 리스너 설정
   */
  private setupProcessEventListeners(processInfo: MCPProcessInfo): void {
    const { process, id } = processInfo;

    // 표준 출력 처리
    process.stdout?.on('data', (data: Buffer) => {
      processInfo.lastActivity = new Date();
      this.emit('serverOutput', { processId: id, name: processInfo.name, data: data.toString() });
    });

    // 표준 에러 처리
    process.stderr?.on('data', (data: Buffer) => {
      processInfo.lastActivity = new Date();
      this.emit('serverError', { processId: id, name: processInfo.name, data: data.toString() });
    });

    // 프로세스 종료 처리
    process.on('close', (code: number, signal: string) => {
      console.log(`[MCP Process Manager] Server ${processInfo.name} process closed with code ${code}, signal ${signal}`);
      this.handleProcessExit(processInfo, code, signal);
    });

    // 프로세스 에러 처리
    process.on('error', (error: Error) => {
      console.error(`[MCP Process Manager] Server ${processInfo.name} process error:`, error);
      this.handleProcessError(processInfo, error);
    });

    // 프로세스 비정상 종료 처리
    process.on('exit', (code: number, signal: string) => {
      console.log(`[MCP Process Manager] Server ${processInfo.name} process exited with code ${code}, signal ${signal}`);
      this.handleProcessExit(processInfo, code, signal);
    });
  }

  /**
   * 프로세스 종료 처리
   */
  private handleProcessExit(processInfo: MCPProcessInfo, code: number, signal: string): void {
    // 헬스 체크 타이머 정리
    this.stopHealthCheck(processInfo.id);
    
    // 프로세스 정보 제거
    this.processes.delete(processInfo.id);
    
    // 비정상 종료 시 자동 재시작 시도
    if (code !== 0 && processInfo.restartCount < processInfo.maxRestarts) {
      console.log(`[MCP Process Manager] Attempting to restart server ${processInfo.name} (attempt ${processInfo.restartCount + 1}/${processInfo.maxRestarts})`);
      this.emit('serverRestarting', { name: processInfo.name, restartCount: processInfo.restartCount + 1 });
    } else if (processInfo.restartCount >= processInfo.maxRestarts) {
      console.error(`[MCP Process Manager] Server ${processInfo.name} exceeded max restart attempts`);
      this.emit('serverMaxRestartsExceeded', { name: processInfo.name, restartCount: processInfo.restartCount });
    }
    
    this.emit('serverExited', { processId: processInfo.id, name: processInfo.name, code, signal });
  }

  /**
   * 프로세스 에러 처리
   */
  private handleProcessError(processInfo: MCPProcessInfo, error: Error): void {
    processInfo.isHealthy = false;
    this.emit('serverError', { processId: processInfo.id, name: processInfo.name, error: error.message });
  }

  /**
   * 헬스 체크 시작
   */
  private startHealthCheck(processId: string, interval: number): void {
    const timer = setInterval(() => {
      this.performHealthCheck(processId);
    }, interval);
    
    this.healthCheckTimers.set(processId, timer);
  }

  /**
   * 헬스 체크 중지
   */
  private stopHealthCheck(processId: string): void {
    const timer = this.healthCheckTimers.get(processId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(processId);
    }
  }

  /**
   * 헬스 체크 수행
   */
  private performHealthCheck(processId: string): void {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return;

    const now = new Date();
    const timeSinceLastActivity = now.getTime() - processInfo.lastActivity.getTime();
    const healthCheckThreshold = 60000; // 1분

    // 마지막 활동으로부터 너무 오래 지났으면 비정상으로 판단
    if (timeSinceLastActivity > healthCheckThreshold) {
      processInfo.isHealthy = false;
      console.warn(`[MCP Process Manager] Server ${processInfo.name} appears unresponsive (last activity: ${timeSinceLastActivity}ms ago)`);
      this.emit('serverUnhealthy', { processId, name: processInfo.name, timeSinceLastActivity });
    } else {
      processInfo.isHealthy = true;
    }
  }

  /**
   * 프로세스 정상 종료 시도
   */
  private async gracefullyKillProcess(process: ChildProcess): Promise<boolean> {
    return new Promise((resolve) => {
      // SIGTERM 신호로 정상 종료 시도
      process.kill('SIGTERM');
      
      // 정상 종료 대기 (5초)
      const timeout = setTimeout(() => {
        // 강제 종료
        process.kill('SIGKILL');
        resolve(false);
      }, 5000);
      
      process.once('exit', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }

  /**
   * 프로세스 시작 완료 대기
   */
  private async waitForProcessStart(process: ChildProcess, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Process start timeout'));
      }, timeout);

      // 프로세스가 시작되면 resolve
      process.once('spawn', () => {
        clearTimeout(timeoutId);
        resolve();
      });

      // 프로세스 에러 시 reject
      process.once('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      // 프로세스가 이미 실행 중인 경우 resolve
      if (process.pid) {
        clearTimeout(timeoutId);
        resolve();
      }
    });
  }

  /**
   * 프로세스 정리 설정
   */
  private setupProcessCleanup(): void {
    // 애플리케이션 종료 시 모든 프로세스 정리
    process.on('SIGINT', async () => {
      console.log('\n[MCP Process Manager] Received SIGINT, cleaning up...');
      await this.stopAllServers();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n[MCP Process Manager] Received SIGTERM, cleaning up...');
      await this.stopAllServers();
      process.exit(0);
    });

    process.on('exit', () => {
      console.log('[MCP Process Manager] Application exiting, cleaning up...');
      this.stopAllServers();
    });
  }

  /**
   * MCP 서버에 명령 실행
   */
  async executeCommand(processId: string, method: string, params: any): Promise<any> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      throw new Error(`Process ${processId} not found`);
    }

    return new Promise((resolve, reject) => {
      const { process } = processInfo;
      
      let output = '';
      let errorOutput = '';
      let isCompleted = false;

      // 표준 출력 처리
      const onData = (data: Buffer) => {
        if (isCompleted) return;
        
        const dataStr = data.toString();
        output += dataStr;
        
        // k6 실행 완료 신호 확인
        if (dataStr.includes('█ TOTAL RESULTS') || 
            dataStr.includes('http_req_duration') ||
            dataStr.includes('iterations') ||
            dataStr.includes('execution: local')) {
          
          // k6 실행이 완료되면 결과 반환
          if (!isCompleted) {
            isCompleted = true;
            cleanup();
            resolve({
              success: true,
              output: output,
              // result 필드 제거하여 이전과 동일한 형태 유지
              metrics: this.parseK6Metrics(output)
            });
          }
        }
        
        // JSON 응답이 완성되었는지 확인 (기존 방식 유지)
        try {
          const response = JSON.parse(output);
          if (!isCompleted) {
            isCompleted = true;
            cleanup();
            resolve(response);
          }
        } catch (error) {
          // JSON이 아직 완성되지 않음, 계속 대기
        }
      };

      // 표준 에러 처리
      const onErrorData = (data: Buffer) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        
        // k6 에러 확인
        if (dataStr.includes('Error:') || dataStr.includes('level=error')) {
          if (!isCompleted) {
            isCompleted = true;
            cleanup();
            reject(new Error(`k6 execution error: ${dataStr}`));
          }
        }
      };

      // 프로세스 에러 처리
      const onError = (error: Error) => {
        if (!isCompleted) {
          isCompleted = true;
          cleanup();
          reject(error);
        }
      };

      // 프로세스 종료 처리
      const onClose = (code: number) => {
        if (!isCompleted) {
          isCompleted = true;
          cleanup();
          if (code === 0) {
            resolve({
              success: true,
              output: output,
              // result 필드 제거하여 이전과 동일한 형태 유지
              metrics: this.parseK6Metrics(output)
            });
          } else {
            reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
          }
        }
      };

      // 이벤트 리스너 등록
      if (process.stdout) {
        process.stdout.on('data', onData);
      }
      if (process.stderr) {
        process.stderr.on('data', onErrorData);
      }
      process.once('error', onError);
      process.once('close', onClose);

      // 요청 전송
      const request = { method, params };
      if (process.stdin) {
        process.stdin.write(JSON.stringify(request) + '\n');
      } else {
        reject(new Error('Process stdin is not available'));
        return;
      }

      // 타임아웃 설정
      const timeout = setTimeout(() => {
        if (!isCompleted) {
          isCompleted = true;
          cleanup();
          reject(new Error('Command execution timeout'));
        }
      }, 600000); // 10분 타임아웃 (k6 서비스와 일치)

      // 정리 함수
      const cleanup = () => {
        clearTimeout(timeout);
        if (process.stdout) {
          process.stdout.removeListener('data', onData);
        }
        if (process.stderr) {
          process.stderr.removeListener('data', onErrorData);
        }
        process.removeListener('error', onError);
        process.removeListener('close', onClose);
      };
    });
  }

  /**
   * k6 메트릭 파싱
   */
  private parseK6Metrics(output: string): any {
    const metrics: any = {};
    
    // http_req_duration 파싱
    const durationMatch = output.match(/http_req_duration.*?p\(95\)=(\d+\.?\d*)ms/);
    if (durationMatch && durationMatch[1]) {
      metrics.http_req_duration_p95 = parseFloat(durationMatch[1]);
    }
    
    // http_req_failed 파싱
    const failedMatch = output.match(/http_req_failed.*?(\d+\.?\d*)%/);
    if (failedMatch && failedMatch[1]) {
      metrics.http_req_failed_rate = parseFloat(failedMatch[1]);
    }
    
    // iterations 파싱
    const iterationsMatch = output.match(/iterations.*?(\d+)/);
    if (iterationsMatch && iterationsMatch[1]) {
      metrics.iterations = parseInt(iterationsMatch[1]);
    }
    
    return metrics;
  }

  /**
   * 리소스 사용량 모니터링
   */
  getResourceUsage(): { totalProcesses: number; healthyProcesses: number; memoryUsage: number } {
    const totalProcesses = this.processes.size;
    const healthyProcesses = Array.from(this.processes.values()).filter(info => info.isHealthy).length;
    
    // 프로세스별 메모리 사용량 추정 (Node.js 프로세스 기준)
    const estimatedMemoryPerProcess = 50; // MB
    const memoryUsage = totalProcesses * estimatedMemoryPerProcess;
    
    return {
      totalProcesses,
      healthyProcesses,
      memoryUsage
    };
  }
} 