import { LoadTestConfig, LoadTestResult } from '../types';
import { join } from 'path';
import { spawn } from 'child_process';

/**
 * k6 MCP 테스트 실행 서비스
 */
export class K6Service {
  private runningTests: Map<string, any> = new Map();
  private testResults: Map<string, any> = new Map();

  constructor() {
    // MCP 서버는 별도 프로세스로 실행
  }

  /**
   * k6 테스트 실행 (MCP 방식)
   */
  async executeTest(testId: string, config: LoadTestConfig): Promise<void> {
    try {
      // k6 스크립트 생성
      const scriptPath = await this.generateK6Script(testId, config);
      
      // MCP 서버를 통해 k6 실행
      const result = await this.executeK6ViaMCP(scriptPath, config);
      
      // 결과 처리
      this.parseK6Output(testId, result);
      this.handleTestCompletion(testId, 'completed');

    } catch (error) {
      console.error('Failed to execute k6 test via MCP:', error);
      this.handleTestCompletion(testId, 'failed');
      throw error;
    }
  }

  /**
   * k6 직접 실행 (MCP 서버 대신)
   */
  private async executeK6ViaMCP(scriptPath: string, config: LoadTestConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`Executing k6 test: ${scriptPath}`);
      console.log(`Config: duration=${config.duration}, vus=${config.vus}`);
      
      // k6 명령어 직접 실행
      const k6Process = spawn('k6', [
        'run',
        '--duration', config.duration || '30s',
        '--vus', String(config.vus || 10),
        scriptPath
      ], {
        env: {
          ...process.env
        }
      });

      let output = '';
      let errorOutput = '';

      k6Process.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        
        // 실시간 진행률 파싱 및 업데이트 (로그 최소화)
        this.parseK6Progress(config.id || '', dataStr);
      });

      k6Process.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        console.error('k6 error:', dataStr);
      });

      k6Process.on('close', (code) => {
        console.log(`k6 process exited with code: ${code}`);
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`k6 execution failed (code ${code}): ${errorOutput}`));
        }
      });

      k6Process.on('error', (error) => {
        console.error('k6 process error:', error);
        reject(new Error(`k6 process error: ${error.message}`));
      });
    });
  }

  /**
   * k6 테스트 중단 (MCP 방식)
   */
  async cancelTest(testId: string): Promise<void> {
    // MCP 서버에서는 직접적인 중단 기능이 없으므로
    // 프로세스 관리를 통해 처리
    this.runningTests.delete(testId);
    this.handleTestCompletion(testId, 'cancelled');
  }

  /**
   * k6 스크립트 생성 (기존과 동일)
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
   * k6 스크립트 내용 생성 (기존과 동일)
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
    errors: ['rate<0.1']
  }
};

export default function () {
  const response = http.get('${config.url}');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(response.status !== 200);
  sleep(1);
}
`;
  }

  /**
   * k6 출력 파싱 및 DB 저장
   */
  private parseK6Output(testId: string, output: string): void {
    console.log('Parsing k6 output for testId:', testId);
    
    // k6 출력에서 메트릭 추출
    const metrics = this.extractMetrics(output);
    const summary = this.extractSummary(output);
    
    // DB에 결과 저장
    this.saveTestResult(testId, metrics, summary);
  }

  /**
   * 메트릭 추출 (k6 출력에서)
   */
  private extractMetrics(output: string): Partial<LoadTestResult['metrics']> {
    const metrics: Partial<LoadTestResult['metrics']> = {
      http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
      http_req_rate: 0,
      http_req_failed: 0,
      vus: 0,
      vus_max: 0
    };

    const lines = output.split('\n');
    
    for (const line of lines) {
      // http_req_duration 파싱
      if (line.includes('http_req_duration')) {
        const match = line.match(/avg=([\d.]+)s min=([\d.]+)s max=([\d.]+)s.*p\(95\)=([\d.]+)s/);
        if (match && match[1] && match[2] && match[3] && match[4]) {
          metrics.http_req_duration = {
            avg: parseFloat(match[1]) * 1000, // ms로 변환
            min: parseFloat(match[2]) * 1000,
            max: parseFloat(match[3]) * 1000,
            p95: parseFloat(match[4]) * 1000
          };
        }
      }
      
      // http_req_rate 파싱
      if (line.includes('http_reqs')) {
        const match = line.match(/(\d+)\s+([\d.]+)\/s/);
        if (match && match[2]) {
          metrics.http_req_rate = parseFloat(match[2]);
        }
      }
      
      // http_req_failed 파싱
      if (line.includes('http_req_failed')) {
        const match = line.match(/(\d+\.\d+)%\s+(\d+)\s+out\s+of\s+(\d+)/);
        if (match && match[1]) {
          metrics.http_req_failed = parseFloat(match[1]);
        }
      }
      
      // vus 파싱
      if (line.includes('vus')) {
        const match = line.match(/(\d+)\s+min=(\d+)\s+max=(\d+)/);
        if (match && match[1] && match[3]) {
          metrics.vus = parseInt(match[1]);
          metrics.vus_max = parseInt(match[3]);
        }
      }
    }

    console.log('Extracted metrics:', metrics);
    return metrics;
  }

  /**
   * 요약 정보 추출
   */
  private extractSummary(output: string): Partial<LoadTestResult['summary']> {
    const summary: Partial<LoadTestResult['summary']> = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      duration: 0
    };

    const lines = output.split('\n');
    
    for (const line of lines) {
      // 총 요청 수
      if (line.includes('http_reqs')) {
        const match = line.match(/(\d+)\s+[\d.]+\/s/);
        if (match && match[1]) {
          summary.totalRequests = parseInt(match[1]);
        }
      }
      
      // 실패한 요청 수
      if (line.includes('http_req_failed')) {
        const match = line.match(/(\d+)\s+out\s+of\s+(\d+)/);
        if (match && match[1]) {
          summary.failedRequests = parseInt(match[1]);
          summary.successfulRequests = (summary.totalRequests || 0) - summary.failedRequests;
        }
      }
      
      // 실행 시간
      if (line.includes('running') && line.includes('VUs')) {
        const match = line.match(/running\s+\((\d+)m(\d+)\.\d+s\)/);
        if (match && match[1] && match[2]) {
          summary.duration = parseInt(match[1]) * 60 + parseInt(match[2]);
        }
      }
    }

    console.log('Extracted summary:', summary);
    return summary;
  }

  /**
   * k6 실시간 진행률 파싱 (최적화)
   */
  private parseK6Progress(testId: string, output: string): void {
    try {
      // progress 정보만 빠르게 파싱
      const progressMatch = output.match(/\[(\d+)%\]/);
      const runningMatch = output.match(/running\s+\((\d+)m(\d+)\.\d+s\)/);
      const timeProgressMatch = output.match(/(\d+\.\d+)s\/(\d+\.\d+)s/);
      const vusMatch = output.match(/(\d+)\/(\d+)\s+VUs/);
      
      if (progressMatch || runningMatch || timeProgressMatch) {
        let progress = 0;
        let currentStep = 'k6 테스트 실행 중...';
        
        // 1. k6에서 제공하는 정확한 진행률 사용
        if (progressMatch && progressMatch[1]) {
          progress = parseInt(progressMatch[1]);
        } 
        // 2. 시간 기반 진행률 계산
        else if (timeProgressMatch && timeProgressMatch[1] && timeProgressMatch[2]) {
          const currentTime = parseFloat(timeProgressMatch[1]);
          const totalTime = parseFloat(timeProgressMatch[2]);
          progress = Math.min(Math.round((currentTime / totalTime) * 100), 95);
        }
        // 3. 실행 시간 기반 진행률 계산
        else if (runningMatch && runningMatch[1] && runningMatch[2]) {
          const minutes = parseInt(runningMatch[1]);
          const seconds = parseInt(runningMatch[2]);
          const totalSeconds = minutes * 60 + seconds;
          
          // k6 output에서 실제 duration 정보 파싱
          const durationMatch = output.match(/(\d+\.\d+)s\/(\d+\.\d+)s/);
          let totalExpectedSeconds = 30; // 기본값
          
          if (durationMatch && durationMatch[2]) {
            totalExpectedSeconds = parseFloat(durationMatch[2]);
          }
          
          progress = Math.min(Math.round((totalSeconds / totalExpectedSeconds) * 100), 95);
        }
        
        // k6가 완료되기 전까지는 100%가 되지 않도록
        if (output.includes('k6 process exited') || output.includes('Test completed') || 
            output.includes('default ✓') || output.includes('THRESHOLDS') ||
            output.includes('checks') || output.includes('http_req_duration')) {
          progress = 100;
          currentStep = '테스트 완료';
        }
        
        // VUs 정보 추가 (간단하게)
        if (vusMatch && vusMatch[1] && vusMatch[2] && progress < 100) {
          const currentVUs = vusMatch[1];
          const maxVUs = vusMatch[2];
          currentStep = `k6 테스트 실행 중... (${currentVUs}/${maxVUs} VUs)`;
        }
        
        // progress가 변경된 경우에만 업데이트
        this.updateTestProgress(testId, progress, currentStep);
      }
    } catch (error) {
      console.error('Failed to parse k6 progress:', error);
    }
  }

  /**
   * 테스트 진행률을 DB에 업데이트 (최적화)
   */
  private async updateTestProgress(testId: string, progress: number, currentStep: string): Promise<void> {
    try {
      const { TestResultService } = await import('../services/test-result-service');
      const testResultService = new TestResultService();
      
      const existingResult = await testResultService.getResultByTestId(testId);
      
      if (existingResult) {
        // progress가 변경된 경우에만 업데이트
        if (existingResult.progress !== progress || existingResult.currentStep !== currentStep) {
          const updatedResult = {
            ...existingResult,
            progress: progress,
            currentStep: currentStep,
            status: 'running' as const,
            updatedAt: new Date().toISOString()
          };
          
          await testResultService.updateResult(updatedResult);
          console.log(`Test progress updated: ${testId} - ${progress}% - ${currentStep}`);
        }
      }
    } catch (error) {
      console.error('Failed to update test progress:', error);
    }
  }

  /**
   * 테스트 결과를 DB에 저장
   */
  private async saveTestResult(testId: string, metrics: Partial<LoadTestResult['metrics']>, summary: Partial<LoadTestResult['summary']>): Promise<void> {
    try {
      // TestResultService를 통해 DB에 저장
      const { TestResultService } = await import('../services/test-result-service');
      const testResultService = new TestResultService();
      
      const existingResult = await testResultService.getResultByTestId(testId);
      
      if (existingResult) {
        const updatedResult = {
          ...existingResult,
          metrics: { ...existingResult.metrics, ...metrics },
          summary: { ...existingResult.summary, ...summary },
          status: 'completed' as const,
          updatedAt: new Date().toISOString()
        };
        
        await testResultService.updateResult(updatedResult);
        console.log('Test result saved to DB:', testId);
      }
    } catch (error) {
      console.error('Failed to save test result to DB:', error);
    }
  }

  /**
   * 테스트 메트릭 업데이트 (사용하지 않음 - DB 저장으로 대체)
   */
  // private updateTestMetrics(testId: string, metrics: Partial<LoadTestResult['metrics']>): void {
  //   const existingResult = this.testResults.get(testId);
  //   if (existingResult) {
  //     existingResult.metrics = { ...existingResult.metrics, ...metrics };
  //     this.testResults.set(testId, existingResult);
  //   }
  // }

  /**
   * 테스트 완료 처리
   */
  private handleTestCompletion(testId: string, status: LoadTestResult['status']): void {
    const result = this.testResults.get(testId);
    if (result) {
      result.status = status;
      result.completedAt = new Date().toISOString();
      this.testResults.set(testId, result);
    }

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
      
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  /**
   * 실행 중인 테스트 목록
   */
  getRunningTests(): string[] {
    return Array.from(this.runningTests.keys());
  }

  /**
   * 테스트 실행 상태 확인
   */
  isTestRunning(testId: string): boolean {
    return this.runningTests.has(testId);
  }

  /**
   * 테스트 결과 가져오기
   */
  getTestResult(testId: string): any {
    return this.testResults.get(testId);
  }
} 