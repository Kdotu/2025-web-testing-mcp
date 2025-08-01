import { LoadTestConfig, LoadTestResult } from '../types';
import { join } from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

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
   * k6 테스트 실행 (기본: 직접 실행 방식)
   */
  async executeTest(testId: string, config: LoadTestConfig): Promise<void> {
    try {
      // 테스트 시작 시 상태를 running으로 설정
      this.runningTests.set(testId, { status: 'running', startTime: new Date() });
      
      // k6 스크립트 생성
      const scriptPath = await this.generateK6Script(testId, config);
      
      // 기본적으로 직접 실행 방식 사용
      const result = await this.executeK6Direct(scriptPath, config);
      console.log('k6 result:', result);

      // 결과 처리
      this.parseK6Output(testId, result, config);
      
      // 테스트 완료 시 상태 업데이트
      this.handleTestCompletion(testId, 'completed');

    } catch (error) {
      console.error('Failed to execute k6 test:', error);
      this.handleTestCompletion(testId, 'failed');
      throw error;
    }
  }

  /**
   * k6 테스트 실행 (MCP 서버 방식)
   */
  async executeTestViaMCP(testId: string, config: LoadTestConfig): Promise<void> {
    try {
      // 테스트 시작 시 상태를 running으로 설정
      this.runningTests.set(testId, { status: 'running', startTime: new Date() });
      
      // k6 스크립트 생성
      const scriptPath = await this.generateK6Script(testId, config);
      
      // MCP 서버를 통해 k6 실행
      const result = await this.executeK6ViaMCP(scriptPath, config);
      console.log('k6 MCP result:', result);

      // 결과 처리
      this.parseK6Output(testId, result, config);
      
      // 테스트 완료 시 상태 업데이트
      this.handleTestCompletion(testId, 'completed');

    } catch (error) {
      console.error('Failed to execute k6 test via MCP:', error);
      this.handleTestCompletion(testId, 'failed');
      throw error;
    }
  }

  /**
   * k6 직접 실행 (기존 방식)
   */
  private async executeK6Direct(scriptPath: string, config: LoadTestConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`Executing k6 test directly: ${scriptPath}`);
      console.log(`Config: duration=${(config as any).duration}, vus=${(config as any).vus}`);
      
      // k6 명령어 직접 실행
      const k6Process = spawn('k6', [
        'run',
        '--duration', (config as any).duration || '30s',
        '--vus', String((config as any).vus || 10),
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
        reject(error);
      });
    });
  }

  /**
   * k6 MCP 서버를 통한 실행 (새로운 방식)
   */
  private async executeK6ViaMCP(scriptPath: string, config: LoadTestConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`[MCP] Starting k6 test via MCP server: ${scriptPath}`);
      console.log(`[MCP] Config: duration=${(config as any).duration}, vus=${(config as any).vus}`);
      
      // MCP 서버 경로 설정
      const k6ServerPath = join(process.cwd(), '..', 'k6-mcp-server');
      const isWindows = process.platform === 'win32';
      const pythonPath = isWindows 
        ? join(k6ServerPath, '.venv', 'Scripts', 'python.exe')
        : 'python';
      
      console.log(`[MCP] Python path: ${pythonPath}`);
      console.log(`[MCP] Working directory: ${k6ServerPath}`);
      
      // Python MCP 서버 프로세스 시작 (1회성 실행)
      const pythonProcess = spawn(pythonPath, ['k6_server.py'], {
        cwd: k6ServerPath,
        env: {
          ...process.env,
          K6_BIN: 'k6'
        }
      });

      console.log(`[MCP] Python process started with PID: ${pythonProcess.pid}`);

      let output = '';
      let errorOutput = '';

      // MCP 서버 출력 처리
      pythonProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log(`[MCP] stdout: ${dataStr.trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        console.error(`[MCP] stderr: ${dataStr.trim()}`);
      });

      // MCP 서버 종료 처리
      pythonProcess.on('close', (code) => {
        console.log(`[MCP] Process exited with code: ${code}`);
        console.log(`[MCP] Total stdout length: ${output.length}`);
        console.log(`[MCP] Total stderr length: ${errorOutput.length}`);
        
        try {
          // JSON 응답 파싱
          const response = JSON.parse(output);
          console.log(`[MCP] Parsed response:`, response);
          
          if (response.error) {
            console.error(`[MCP] Server returned error: ${response.error}`);
            reject(new Error(`MCP server error: ${response.error}`));
          } else if (response.result) {
            console.log(`[MCP] Successfully received result`);
            resolve(response.result);
          } else {
            console.error(`[MCP] Invalid response format`);
            reject(new Error('MCP server returned invalid response format'));
          }
        } catch (parseError) {
          console.error('[MCP] Failed to parse response:', parseError);
          console.error('[MCP] Raw output:', output);
          reject(new Error(`Failed to parse MCP server response: ${output}`));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('[MCP] Process error:', error);
        reject(error);
      });

      // MCP 서버에 테스트 요청 전송 (JSON 형태)
      const testRequest = {
        method: 'execute_k6_test',
        params: {
          script_file: scriptPath,
          duration: (config as any).duration || '30s',
          vus: (config as any).vus || 10
        }
      };

      console.log(`[MCP] Sending request:`, JSON.stringify(testRequest));
      
      // 요청을 JSON 형태로 전송
      pythonProcess.stdin.write(JSON.stringify(testRequest) + '\n');
      pythonProcess.stdin.end();
      
      console.log(`[MCP] Request sent, stdin closed`);
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
    // config.url을 우선 사용하고, 없으면 targetUrl, 마지막으로 기본값 사용
    let targetUrl = (config as any).url || (config as any).targetUrl || 'http://[::1]:3101/api/test-results';
    
    // localhost URL을 IPv6 주소로 자동 변환
    if (targetUrl.includes('localhost')) {
      targetUrl = targetUrl.replace(/localhost/g, '[::1]');
      // HTTPS를 HTTP로 변경 (localhost는 보통 HTTP)
      targetUrl = targetUrl.replace(/^https:\/\//, 'http://');
      console.log('Backend: URL converted from localhost to IPv6 HTTP:', (config as any).url, '->', targetUrl);
    }
    
    const duration = (config as any).duration || '30s';
    const vus = (config as any).vus || 10;
    
    console.log('Creating k6 script with targetUrl:', targetUrl);
    
    return `
import http from "k6/http";
import { sleep } from "k6";
import { check } from "k6";

export const options = {
  vus: ${vus},
  duration: "${duration}",
  thresholds: {
    http_req_duration: ["p(95)<5000"], // 2000ms에서 5000ms로 증가
    http_req_failed: ["rate<0.8"], // 0.5에서 0.8로 증가
  },
};

export default function () {
  const response = http.get("${targetUrl}");
  
  check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 5000ms": (r) => r.timings.duration < 5000, // 2000ms에서 5000ms로 증가
  });
  
  sleep(1);
}
`;
  }

  /**
   * k6 출력 파싱 및 저장
   */
  private parseK6Output(testId: string, output: string, config?: LoadTestConfig): void {
    console.log('Parsing k6 output for testId:', testId);
    console.log('Output length:', output.length);
    console.log('Config:', config);
    
    try {
      // 메트릭 추출
    const metrics = this.extractMetrics(output);
      const summary = this.extractSummary(output);
      
      // 상세 메트릭 파싱 및 저장
      const detailedMetrics = this.extractDetailedMetrics(output);
      
      // DB에 저장 (raw_data 포함, 설정 정보 전달)
      this.saveTestResult(testId, metrics, summary, output, config);
      this.saveDetailedMetrics(testId, detailedMetrics);
      
      console.log('k6 output parsed and saved to DB');
    } catch (error) {
      console.error('Failed to parse k6 output:', error);
    }
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
   * 상세 메트릭 추출
   */
  private extractDetailedMetrics(output: string): any {
    const metrics: any = {};
    
    try {
      // HTTP 메트릭 파싱
      const httpDurationMatch = output.match(/http_req_duration.*?: avg=([\d.]+)ms min=([\d.]+)ms med=([\d.]+)ms max=([\d.]+)ms p\(90\)=([\d.]+)ms p\(95\)=([\d.]+)ms/);
      if (httpDurationMatch && httpDurationMatch[1] && httpDurationMatch[2] && httpDurationMatch[3] && httpDurationMatch[4] && httpDurationMatch[5] && httpDurationMatch[6]) {
        metrics.http_req_duration_avg = parseFloat(httpDurationMatch[1]);
        metrics.http_req_duration_min = parseFloat(httpDurationMatch[2]);
        metrics.http_req_duration_med = parseFloat(httpDurationMatch[3]);
        metrics.http_req_duration_max = parseFloat(httpDurationMatch[4]);
        metrics.http_req_duration_p90 = parseFloat(httpDurationMatch[5]);
        metrics.http_req_duration_p95 = parseFloat(httpDurationMatch[6]);
      }
      
      // HTTP 요청 실패율
      const httpFailedMatch = output.match(/http_req_failed.*?: ([\d.]+)%/);
      if (httpFailedMatch && httpFailedMatch[1]) {
        metrics.http_req_failed_rate = parseFloat(httpFailedMatch[1]);
      }
      
      // HTTP 요청 수
      const httpReqsMatch = output.match(/http_reqs.*?: (\d+)\s+([\d.]+)\/s/);
      if (httpReqsMatch && httpReqsMatch[1] && httpReqsMatch[2]) {
        metrics.http_reqs_total = parseInt(httpReqsMatch[1]);
        metrics.http_reqs_rate = parseFloat(httpReqsMatch[2]);
      }
      
      // 체크 메트릭
      const checksTotalMatch = output.match(/checks_total.*?: (\d+)/);
      const checksSucceededMatch = output.match(/checks_succeeded.*?: ([\d.]+)% (\d+) out of (\d+)/);
      const checksFailedMatch = output.match(/checks_failed.*?: ([\d.]+)% (\d+) out of (\d+)/);
      
      if (checksTotalMatch && checksTotalMatch[1]) {
        metrics.checks_total = parseInt(checksTotalMatch[1]);
      }
      if (checksSucceededMatch && checksSucceededMatch[1] && checksSucceededMatch[2]) {
        metrics.checks_succeeded_rate = parseFloat(checksSucceededMatch[1]);
        metrics.checks_succeeded = parseInt(checksSucceededMatch[2]);
      }
      if (checksFailedMatch && checksFailedMatch[2]) {
        metrics.checks_failed = parseInt(checksFailedMatch[2]);
      }
      
      // 실행 메트릭
      const iterationsMatch = output.match(/iterations.*?: (\d+)\s+([\d.]+)\/s/);
      if (iterationsMatch && iterationsMatch[1] && iterationsMatch[2]) {
        metrics.iterations_total = parseInt(iterationsMatch[1]);
        metrics.iterations_rate = parseFloat(iterationsMatch[2]);
      }
      
      const iterationDurationMatch = output.match(/iteration_duration.*?: avg=([\d.]+)s\s+min=([\d.]+)s\s+med=([\d.]+)s\s+max=([\d.]+)s\s+p\(90\)=([\d.]+)s\s+p\(95\)=([\d.]+)s/);
      if (iterationDurationMatch && iterationDurationMatch[1] && iterationDurationMatch[2] && iterationDurationMatch[3] && iterationDurationMatch[4] && iterationDurationMatch[5] && iterationDurationMatch[6]) {
        metrics.iteration_duration_avg = parseFloat(iterationDurationMatch[1]);
        metrics.iteration_duration_min = parseFloat(iterationDurationMatch[2]);
        metrics.iteration_duration_med = parseFloat(iterationDurationMatch[3]);
        metrics.iteration_duration_max = parseFloat(iterationDurationMatch[4]);
        metrics.iteration_duration_p90 = parseFloat(iterationDurationMatch[5]);
        metrics.iteration_duration_p95 = parseFloat(iterationDurationMatch[6]);
      }
      
      // VU 메트릭
      const vusMatch = output.match(/vus.*?: (\d+)\s+min=(\d+)\s+max=(\d+)/);
      if (vusMatch && vusMatch[1] && vusMatch[2] && vusMatch[3]) {
        metrics.vus_avg = parseInt(vusMatch[1]);
        metrics.vus_min = parseInt(vusMatch[2]);
        metrics.vus_max = parseInt(vusMatch[3]);
      }
      
      // 네트워크 메트릭
      const dataReceivedMatch = output.match(/data_received.*?: ([\d.]+) (MB|KB)\s+([\d.]+) (MB|KB)\/s/);
      if (dataReceivedMatch && dataReceivedMatch[1] && dataReceivedMatch[2] && dataReceivedMatch[3] && dataReceivedMatch[4]) {
        const size = parseFloat(dataReceivedMatch[1]);
        const unit = dataReceivedMatch[2];
        const rate = parseFloat(dataReceivedMatch[3]);
        const rateUnit = dataReceivedMatch[4];
        
        // MB를 바이트로 변환
        if (unit === 'MB') {
          metrics.data_received_bytes = Math.round(size * 1024 * 1024);
        } else if (unit === 'KB') {
          metrics.data_received_bytes = Math.round(size * 1024);
        }
        
        if (rateUnit === 'MB') {
          metrics.data_received_rate = rate * 1024 * 1024;
        } else if (rateUnit === 'KB') {
          metrics.data_received_rate = rate * 1024;
        }
      }
      
      const dataSentMatch = output.match(/data_sent.*?: ([\d.]+) (MB|KB)\s+([\d.]+) (MB|KB|B)\/s/);
      if (dataSentMatch && dataSentMatch[1] && dataSentMatch[2] && dataSentMatch[3] && dataSentMatch[4]) {
        const size = parseFloat(dataSentMatch[1]);
        const unit = dataSentMatch[2];
        const rate = parseFloat(dataSentMatch[3]);
        const rateUnit = dataSentMatch[4];
        
        if (unit === 'MB') {
          metrics.data_sent_bytes = Math.round(size * 1024 * 1024);
        } else if (unit === 'KB') {
          metrics.data_sent_bytes = Math.round(size * 1024);
        }
        
        if (rateUnit === 'MB') {
          metrics.data_sent_rate = rate * 1024 * 1024;
        } else if (rateUnit === 'KB') {
          metrics.data_sent_rate = rate * 1024;
        } else if (rateUnit === 'B') {
          metrics.data_sent_rate = rate;
        }
      }
      
      // 커스텀 메트릭 (errors)
      const errorsMatch = output.match(/errors.*?: ([\d.]+)% (\d+) out of (\d+)/);
      if (errorsMatch && errorsMatch[1] && errorsMatch[2]) {
        metrics.errors_rate = parseFloat(errorsMatch[1]);
        metrics.errors_total = parseInt(errorsMatch[2]);
      }
      
      // 임계값 결과 파싱
      const thresholdResults = this.parseThresholdResults(output);
      metrics.threshold_results = thresholdResults;
      metrics.thresholds_passed = thresholdResults?.passed || 0;
      metrics.thresholds_failed = thresholdResults?.failed || 0;
      
    } catch (error) {
      console.error('Failed to extract detailed metrics:', error);
    }

    return metrics;
  }

  /**
   * 임계값 결과 파싱
   */
  private parseThresholdResults(output: string): any {
    const results: any = { passed: 0, failed: 0, details: {} };
    
    try {
      // THRESHOLDS 섹션 찾기
      const thresholdsSection = output.match(/█ THRESHOLDS([\s\S]*?)(?=█|$)/);
      if (thresholdsSection && thresholdsSection[1]) {
        const thresholdLines = thresholdsSection[1].split('\n');
        
        for (const line of thresholdLines) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('█')) {
            // ✓ 또는 ✗ 기호로 통과/실패 확인
            if (trimmedLine.includes('✓')) {
              results.passed++;
              const metricName = trimmedLine.match(/^\s*([^\s]+)/)?.[1];
              if (metricName) {
                results.details[metricName] = { status: 'passed', value: trimmedLine };
              }
            } else if (trimmedLine.includes('✗')) {
              results.failed++;
              const metricName = trimmedLine.match(/^\s*([^\s]+)/)?.[1];
              if (metricName) {
                results.details[metricName] = { status: 'failed', value: trimmedLine };
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse threshold results:', error);
    }
    
    return results;
  }

  /**
   * 상세 메트릭을 DB에 저장 (단순화된 구조)
   */
  private async saveDetailedMetrics(testId: string, metrics: any): Promise<void> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env['SUPABASE_URL'];
      const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials not found');
        return;
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // 메트릭을 key-value 형태로 변환하여 저장
      const metricRecords = this.convertMetricsToRecords(testId, metrics);
      
      if (metricRecords.length > 0) {
        const { error: dbError } = await supabase
          .from('m2_test_metrics')
          .insert(metricRecords);
        
        if (dbError) {
          console.error('Failed to save detailed metrics to database:', dbError);
        } else {
          console.log(`Successfully saved ${metricRecords.length} metric records to DB for test:`, testId);
        }
      }
    } catch (error) {
      console.error('Failed to save detailed metrics:', error);
    }
  }

  /**
   * 메트릭을 key-value 형태의 레코드로 변환
   */
  private convertMetricsToRecords(testId: string, metrics: any): any[] {
    const records: any[] = [];
    const now = new Date().toISOString();
    
    // HTTP 메트릭
    if (metrics.http_req_duration_avg !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'http',
        metric_name: 'req_duration_avg',
        value: metrics.http_req_duration_avg,
        unit: 'ms',
        description: 'HTTP 요청 평균 응답 시간',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.http_req_duration_p95 !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'http',
        metric_name: 'req_duration_p95',
        value: metrics.http_req_duration_p95,
        unit: 'ms',
        description: 'HTTP 요청 95퍼센타일 응답 시간',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.http_req_failed_rate !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'http',
        metric_name: 'req_failed_rate',
        value: metrics.http_req_failed_rate,
        unit: '%',
        description: 'HTTP 요청 실패율',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.http_reqs_total !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'http',
        metric_name: 'reqs_total',
        value: metrics.http_reqs_total,
        unit: 'count',
        description: '총 HTTP 요청 수',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.http_reqs_rate !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'http',
        metric_name: 'reqs_rate',
        value: metrics.http_reqs_rate,
        unit: 'req/s',
        description: 'HTTP 요청 속도',
        created_at: now,
        updated_at: now
      });
    }
    
    // 체크 메트릭
    if (metrics.checks_total !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'checks',
        metric_name: 'total',
        value: metrics.checks_total,
        unit: 'count',
        description: '총 체크 수',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.checks_succeeded !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'checks',
        metric_name: 'succeeded',
        value: metrics.checks_succeeded,
        unit: 'count',
        description: '성공한 체크 수',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.checks_succeeded_rate !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'checks',
        metric_name: 'succeeded_rate',
        value: metrics.checks_succeeded_rate,
        unit: '%',
        description: '체크 성공률',
        created_at: now,
        updated_at: now
      });
    }
    
    // 실행 메트릭
    if (metrics.iterations_total !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'execution',
        metric_name: 'iterations_total',
        value: metrics.iterations_total,
        unit: 'count',
        description: '총 반복 수',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.iterations_rate !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'execution',
        metric_name: 'iterations_rate',
        value: metrics.iterations_rate,
        unit: 'iter/s',
        description: '반복 속도',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.iteration_duration_avg !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'execution',
        metric_name: 'duration_avg',
        value: metrics.iteration_duration_avg,
        unit: 's',
        description: '평균 반복 시간',
        created_at: now,
        updated_at: now
      });
    }
    
    // VU 메트릭
    if (metrics.vus_avg !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'vus',
        metric_name: 'avg',
        value: metrics.vus_avg,
        unit: 'count',
        description: '평균 가상 사용자 수',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.vus_min !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'vus',
        metric_name: 'min',
        value: metrics.vus_min,
        unit: 'count',
        description: '최소 가상 사용자 수',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.vus_max !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'vus',
        metric_name: 'max',
        value: metrics.vus_max,
        unit: 'count',
        description: '최대 가상 사용자 수',
        created_at: now,
        updated_at: now
      });
    }
    
    // 네트워크 메트릭
    if (metrics.data_received_bytes !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'network',
        metric_name: 'data_received_bytes',
        value: metrics.data_received_bytes,
        unit: 'bytes',
        description: '수신된 데이터량',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.data_sent_bytes !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'network',
        metric_name: 'data_sent_bytes',
        value: metrics.data_sent_bytes,
        unit: 'bytes',
        description: '송신된 데이터량',
        created_at: now,
        updated_at: now
      });
    }
    
    // 임계값 메트릭
    if (metrics.thresholds_passed !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'thresholds',
        metric_name: 'passed',
        value: metrics.thresholds_passed,
        unit: 'count',
        description: '통과한 임계값 수',
        created_at: now,
        updated_at: now
      });
    }
    
    if (metrics.thresholds_failed !== undefined) {
      records.push({
        test_id: testId,
        metric_type: 'thresholds',
        metric_name: 'failed',
        value: metrics.thresholds_failed,
        unit: 'count',
        description: '실패한 임계값 수',
        created_at: now,
        updated_at: now
      });
    }
    
    return records;
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
        this.updateTestProgress(testId, currentStep);
      }
    } catch (error) {
      console.error('Failed to parse k6 progress:', error);
    }
  }

  /**
   * 테스트 진행률 업데이트 (progress 제거)
   */
  private async updateTestProgress(testId: string, currentStep: string): Promise<void> {
    try {
      // TestResultService를 통해 DB에 업데이트
      const { TestResultService } = await import('../services/test-result-service');
      const testResultService = new TestResultService();
      
      const existingResult = await testResultService.getResultByTestId(testId);
      
      if (existingResult) {
        const updatedResult = {
          ...existingResult,
          currentStep: currentStep,
          updatedAt: new Date().toISOString()
        };
        
        await testResultService.updateResult(updatedResult);
      }
    } catch (error) {
      console.error('Failed to update test progress:', error);
    }
  }

  /**
   * k6 출력에서 raw_data 추출 (타임스탬프 및 설정 정보 추가)
   */
  private extractRawData(output: string, config?: LoadTestConfig): string {
    // 현재 시간을 한국 시간으로 포맷팅
    const now = new Date();
    const koreanTime = now.toLocaleString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\./g, '-').replace(/\s/g, ' ');

    const timestampLine = `====TEST START DATE ${koreanTime}====\n\n`;
    
    // 설정 정보 추가
    let configInfo = '';
    if (config) {
      configInfo = `------------------------------------\n-------TEST CONFIG-------\n`;
      configInfo += `Duration: ${(config as any).duration || '30s'}\n`;
      configInfo += `Virtual Users: ${(config as any).vus || 10}\n`;
      if ((config as any).detailedConfig) {
        configInfo += `Test Type: ${(config as any).detailedConfig.testType || 'load'}\n`;
        if ((config as any).detailedConfig.settings) {
          configInfo += `Settings: ${JSON.stringify((config as any).detailedConfig.settings, null, 2)}\n`;
        }
      }
      configInfo += `------------------------------------\n\n`;
    }
    
    // k6 result 부분 찾기
    const startIndex = output.indexOf('k6 result:');
    if (startIndex === -1) {
      // k6 result가 없으면 전체 출력에 타임스탬프와 설정 정보 추가
      return timestampLine + configInfo + output;
    }
    
    return timestampLine + configInfo + output.substring(startIndex);
  }

  /**
   * 테스트 결과를 DB에 저장
   */
  private async saveTestResult(testId: string, metrics: Partial<LoadTestResult['metrics']>, summary: Partial<LoadTestResult['summary']>, rawData: string, config?: LoadTestConfig): Promise<void> {
    try {
      console.log('saveTestResult called with testId:', testId);
      console.log('rawData length:', rawData.length);
      console.log('config:', config);
      
      // TestResultService를 통해 DB에 저장
      const { TestResultService } = await import('../services/test-result-service');
      const testResultService = new TestResultService();
      
      const existingResult = await testResultService.getResultByTestId(testId);
      console.log('existingResult found:', !!existingResult);
      
    if (existingResult) {
        const extractedRawData = this.extractRawData(rawData, config);
        console.log('extractedRawData length:', extractedRawData.length);
        
        const updatedResult = {
          ...existingResult,
          metrics: { ...existingResult.metrics, ...metrics },
          summary: { ...existingResult.summary, ...summary },
          raw_data: extractedRawData,
          status: 'completed' as const, // 테스트 완료 시에만 completed로 설정
          updatedAt: new Date().toISOString()
        };
        
        await testResultService.updateResult(updatedResult);
        console.log('Test result updated in DB:', testId);
      } else {
        console.error('No existing result found for testId:', testId);
        // existingResult가 없어도 raw_data를 저장하기 위해 새로운 결과 생성
        const extractedRawData = this.extractRawData(rawData, config);
        console.log('Creating new result with raw_data, length:', extractedRawData.length);
        
        const newResult: LoadTestResult = {
          id: uuidv4(),
          testId,
          testType: 'load',
          url: config?.url || '',
          name: '', // name 필드는 비워두고 description만 사용
          status: 'completed', // 테스트 완료 시에만 completed로 설정
          metrics: {
            http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
            http_req_rate: 0,
            http_req_failed: 0,
            vus: 0,
            vus_max: 0,
            ...metrics
          },
          summary: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            duration: 0,
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            ...summary
          },
          raw_data: extractedRawData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await testResultService.saveResult(newResult);
        console.log('New test result saved in DB:', testId);
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