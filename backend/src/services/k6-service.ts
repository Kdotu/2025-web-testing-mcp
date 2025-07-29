import { LoadTestConfig, LoadTestResult } from '../types';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

/**
 * k6 테스트 실행 서비스
 */
export class K6Service {
  private runningTests: Map<string, ChildProcess> = new Map();
  private testResults: Map<string, any> = new Map();

  /**
   * k6 테스트 실행
   */
  async executeTest(testId: string, config: LoadTestConfig): Promise<void> {
    try {
      // k6 스크립트 생성
      const scriptPath = await this.generateK6Script(testId, config);
      
      // k6 실행 옵션 설정
      const k6Options = [
        'run',
        '--out', 'json=results.json',
        '--no-usage-report',
        scriptPath
      ];

      // k6 프로세스 시작
      const k6Process = spawn('k6', k6Options, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // 프로세스 저장
      this.runningTests.set(testId, k6Process);

      // 결과 스트림 설정
      let output = '';
      k6Process.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        this.parseK6Output(testId, data.toString());
      });

      k6Process.stderr?.on('data', (data: Buffer) => {
        console.error(`k6 error for test ${testId}:`, data.toString());
      });

      // 프로세스 완료 처리
      k6Process.on('close', (code: number) => {
        this.runningTests.delete(testId);
        
        if (code === 0) {
          this.handleTestCompletion(testId, 'completed');
        } else {
          this.handleTestCompletion(testId, 'failed');
        }
      });

      // 에러 처리
      k6Process.on('error', (error: Error) => {
        console.error(`k6 process error for test ${testId}:`, error);
        this.runningTests.delete(testId);
        this.handleTestCompletion(testId, 'failed');
      });

    } catch (error) {
      console.error('Failed to execute k6 test:', error);
      this.handleTestCompletion(testId, 'failed');
      throw error;
    }
  }

  /**
   * k6 테스트 중단
   */
  async cancelTest(testId: string): Promise<void> {
    const process = this.runningTests.get(testId);
    
    if (process) {
      process.kill('SIGTERM');
      this.runningTests.delete(testId);
      this.handleTestCompletion(testId, 'cancelled');
    }
  }

  /**
   * k6 스크립트 생성
   */
  private async generateK6Script(testId: string, config: LoadTestConfig): Promise<string> {
    const scriptContent = this.createK6ScriptContent(config);
    const scriptPath = join(process.cwd(), 'temp', `${testId}.js`);
    
    // 임시 디렉토리 생성
    const fs = await import('fs');
    const tempDir = join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 스크립트 파일 작성
    fs.writeFileSync(scriptPath, scriptContent);
    
    return scriptPath;
  }

  /**
   * k6 스크립트 내용 생성
   */
  private createK6ScriptContent(config: LoadTestConfig): string {
    const stages = config.stages.map(stage => 
      `{ duration: '${stage.duration}', target: ${stage.target} }`
    ).join(',\n    ');

    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    ${stages}
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.1'],
  },
};

export default function() {
  const response = http.get('${config.url}');
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  sleep(1);
}
`;
  }

  /**
   * k6 출력 파싱
   */
  private parseK6Output(testId: string, output: string): void {
    // 간단한 메트릭 파싱 (실제로는 더 정교한 파싱 필요)
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('http_req_duration')) {
        // 응답 시간 메트릭 파싱
        const match = line.match(/avg=(\d+\.?\d*)/);
        if (match && match[1]) {
          const avgResponseTime = parseFloat(match[1]);
          this.updateTestMetrics(testId, { avgResponseTime });
        }
      }
    }
  }

  /**
   * 테스트 메트릭 업데이트
   */
  private updateTestMetrics(testId: string, metrics: Partial<LoadTestResult['metrics']>): void {
    const currentMetrics = this.testResults.get(testId) || {};
    this.testResults.set(testId, { ...currentMetrics, ...metrics });
  }

  /**
   * 테스트 완료 처리
   */
  private handleTestCompletion(testId: string, status: LoadTestResult['status']): void {
    console.log(`Test ${testId} ${status}`);
    
    // 결과 정리
    this.testResults.delete(testId);
    
    // 임시 파일 정리
    this.cleanupTempFiles(testId);
  }

  /**
   * 임시 파일 정리
   */
  private async cleanupTempFiles(testId: string): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const tempDir = path.join(process.cwd(), 'temp');
      const scriptPath = path.join(tempDir, `${testId}.js`);
      const resultsPath = path.join(tempDir, 'results.json');
      
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
      
      if (fs.existsSync(resultsPath)) {
        fs.unlinkSync(resultsPath);
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  /**
   * 실행 중인 테스트 목록 조회
   */
  getRunningTests(): string[] {
    return Array.from(this.runningTests.keys());
  }

  /**
   * 테스트 상태 확인
   */
  isTestRunning(testId: string): boolean {
    return this.runningTests.has(testId);
  }
} 