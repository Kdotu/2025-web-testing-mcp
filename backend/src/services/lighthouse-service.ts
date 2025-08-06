import { LoadTestConfig, LoadTestResult } from '../types';
import { join } from 'path';
import { spawn } from 'child_process';

/**
 * Lighthouse MCP 테스트 실행 서비스
 */
export class LighthouseService {
  private runningTests: Map<string, any> = new Map();
  private testResults: Map<string, any> = new Map();

  constructor() {
    // MCP 서버는 별도 프로세스로 실행
  }

  /**
   * Lighthouse 테스트 실행 (MCP 서버 방식)
   */
  async executeTest(id: string, testId: string, config: LoadTestConfig): Promise<void> {
    try {
      // 테스트 시작 시 상태를 running으로 설정
      this.runningTests.set(testId, { status: 'running', startTime: new Date() });
      
      // Lighthouse MCP 서버를 통해 테스트 실행
      const result = await this.executeLighthouseViaMCP(config);
      console.log('Lighthouse MCP result:', result);

      // 결과 처리
      await this.parseLighthouseOutput(id, testId, result, config);
      
      // 테스트 완료 시 상태 업데이트
      this.handleTestCompletion(testId, 'completed');

    } catch (error) {
      console.error('Failed to execute Lighthouse test via MCP:', error);
      this.handleTestCompletion(testId, 'failed');
      throw error;
    }
  }

  /**
   * Lighthouse MCP 서버를 통한 테스트 실행
   */
  private async executeLighthouseViaMCP(config: LoadTestConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`[MCP] Starting Lighthouse test via MCP server`);
      console.log(`[MCP] Config: url=${(config as any).url}, device=${(config as any).device || 'desktop'}`);
      
      // Lighthouse MCP 서버 경로 설정
      const lighthouseServerPath = join(process.cwd(), 'mcp', 'lighthouse-mcp-server');
      const isWindows = process.platform === 'win32';
      const nodePath = isWindows ? 'node' : 'node';
      
      console.log(`[MCP] Node path: ${nodePath}`);
      console.log(`[MCP] Working directory: ${lighthouseServerPath}`);
      
      // Node.js Lighthouse MCP 서버 프로세스 시작 (1회성 실행)
      const nodeProcess = spawn(nodePath, ['lighthouse_server.js'], {
        cwd: lighthouseServerPath,
        env: {
          ...process.env,
          LIGHTHOUSE_BIN: 'lighthouse'
        }
      });

      console.log(`[MCP] Node process started with PID: ${nodeProcess.pid}`);

      let output = '';
      let errorOutput = '';

      // MCP 서버 출력 처리
      nodeProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log(`[MCP] stdout: ${dataStr.trim()}`);
      });

      nodeProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        console.error(`[MCP] stderr: ${dataStr.trim()}`);
      });

      // MCP 서버 종료 처리
      nodeProcess.on('close', (code) => {
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

      nodeProcess.on('error', (error) => {
        console.error('[MCP] Process error:', error);
        reject(error);
      });

      // MCP 서버에 테스트 요청 전송 (JSON 형태)
      const testRequest = {
        method: 'run_audit',
        params: {
          url: (config as any).url,
          device: (config as any).device || 'desktop',
          categories: (config as any).categories || ['performance', 'accessibility', 'best-practices', 'seo'],
          throttling: true
        }
      };

      console.log(`[MCP] Sending request:`, JSON.stringify(testRequest));
      
      // 요청을 JSON 형태로 전송
      nodeProcess.stdin.write(JSON.stringify(testRequest) + '\n');
      nodeProcess.stdin.end();
      
      console.log(`[MCP] Request sent, stdin closed`);
    });
  }

  /**
   * Lighthouse 결과 파싱
   */
  private async parseLighthouseOutput(id: string, testId: string, output: string, config?: LoadTestConfig): Promise<void> {
    try {
      console.log('Parsing Lighthouse output...');
      
      // JSON 결과 파싱 (Lighthouse MCP 응답 구조 처리)
      let lighthouseResult;
      
      if (typeof output === 'string') {
        // JSON 문자열을 파싱
        lighthouseResult = JSON.parse(output);
      } else if (Array.isArray(output) && (output as any[]).length > 0) {
        // MCP 응답이 배열 형태인 경우 (첫 번째 요소의 text 필드에서 JSON 추출)
        const firstItem = (output as any[])[0];
        if (firstItem.type === 'text' && firstItem.text) {
          try {
            // text 필드의 JSON 문자열을 파싱
            lighthouseResult = JSON.parse(firstItem.text);
          } catch (parseError) {
            console.error('Failed to parse Lighthouse text content:', parseError);
            throw new Error('Invalid Lighthouse result format');
          }
        } else {
          lighthouseResult = output;
        }
      } else {
        lighthouseResult = output;
      }
      
      console.log('Initial parsed result structure:', {
        hasResult: !!lighthouseResult.result,
        hasData: !!lighthouseResult.result?.data,
        topLevelKeys: Object.keys(lighthouseResult)
      });
      
      // MCP 응답 구조 처리: result.data에서 실제 Lighthouse 데이터 추출
      if (lighthouseResult.result && lighthouseResult.result.data) {
        console.log('Found result.data structure, extracting...');
        lighthouseResult = lighthouseResult.result.data;
        console.log('Extracted data structure:', {
          hasCategories: !!lighthouseResult.categories,
          hasMetrics: !!lighthouseResult.metrics,
          hasAudits: !!lighthouseResult.audits,
          categoryKeys: lighthouseResult.categories ? Object.keys(lighthouseResult.categories) : [],
          metricKeys: lighthouseResult.metrics ? Object.keys(lighthouseResult.metrics) : []
        });
      } else if (lighthouseResult.data) {
        // 직접 data 필드에 Lighthouse 결과가 있는 경우
        console.log('Found direct data structure, extracting...');
        lighthouseResult = lighthouseResult.data;
        console.log('Extracted data structure:', {
          hasCategories: !!lighthouseResult.categories,
          hasMetrics: !!lighthouseResult.metrics,
          hasAudits: !!lighthouseResult.audits,
          categoryKeys: lighthouseResult.categories ? Object.keys(lighthouseResult.categories) : [],
          metricKeys: lighthouseResult.metrics ? Object.keys(lighthouseResult.metrics) : []
        });
      } else {
        console.log('No result.data or data structure found, using original result');
      }
      
      console.log('Parsed Lighthouse result structure:', {
        hasScores: !!lighthouseResult.scores,
        hasMetrics: !!lighthouseResult.metrics,
        hasCategories: !!lighthouseResult.categories,
        scoreKeys: lighthouseResult.scores ? Object.keys(lighthouseResult.scores) : [],
        metricKeys: lighthouseResult.metrics ? Object.keys(lighthouseResult.metrics) : [],
        categoryKeys: lighthouseResult.categories ? Object.keys(lighthouseResult.categories) : []
      });
      
      // 디버깅: 전체 구조 확인
      console.log('Full lighthouseResult keys:', Object.keys(lighthouseResult));
      
      // 디버깅: categories 구조 확인
      if (lighthouseResult.categories) {
        console.log('Categories structure:', {
          performance: lighthouseResult.categories.performance,
          accessibility: lighthouseResult.categories.accessibility,
          'best-practices': lighthouseResult.categories['best-practices'],
          seo: lighthouseResult.categories.seo
        });
      } else {
        console.log('No categories found in lighthouseResult');
      }
      
      // 디버깅: metrics 구조 확인
      if (lighthouseResult.metrics) {
        console.log('Metrics structure:', {
          fcp: lighthouseResult.metrics['first-contentful-paint'],
          lcp: lighthouseResult.metrics['largest-contentful-paint'],
          tbt: lighthouseResult.metrics['total-blocking-time'],
          cls: lighthouseResult.metrics['cumulative-layout-shift']
        });
      } else {
        console.log('No metrics found in lighthouseResult');
      }
      
      // 메트릭 추출
      const metrics = this.extractLighthouseMetrics(lighthouseResult);
      
      // 요약 정보 추출
      const summary = this.extractLighthouseSummary(lighthouseResult);
      
      // 상세 정보 추출
      const details = this.extractLighthouseDetails(lighthouseResult);
      
      // 원시 데이터를 정돈된 형태로 저장
      let rawData: string;
      
      try {
        // 전체 Lighthouse 결과를 raw_data로 저장 (모든 중요 정보 포함)
        const rawResult = {
          lighthouseVersion: lighthouseResult.lighthouseVersion,
          requestedUrl: lighthouseResult.requestedUrl,
          finalUrl: lighthouseResult.finalUrl,
          fetchTime: lighthouseResult.fetchTime,
          userAgent: lighthouseResult.userAgent,
          categories: lighthouseResult.categories,
          metrics: lighthouseResult.metrics,
          audits: lighthouseResult.audits,
          configSettings: lighthouseResult.configSettings,
          environment: lighthouseResult.environment,
          categoryGroups: lighthouseResult.categoryGroups,
          timing: lighthouseResult.timing,
          i18n: lighthouseResult.i18n
        };
        
        // JSON 문자열로 변환 (압축 없이 가독성 유지)
        rawData = JSON.stringify(rawResult, null, 2);
        
        console.log('Raw data generated successfully, length:', rawData.length);
        console.log('Raw data preview:', rawData.substring(0, 500) + '...');
      } catch (e) {
        console.error('Failed to generate raw data:', e);
        // 실패 시 원본 output 사용
        rawData = typeof output === 'string' ? output : JSON.stringify(output);
      }
      
      // 결과 저장
      this.saveLighthouseResult(id, testId, metrics, summary, details, rawData, config);
      
      // 메트릭을 개별적으로 저장 (Lighthouse test_id 사용)
      await this.saveLighthouseMetrics(testId, lighthouseResult);
      
      // 테스트 완료 처리
      this.handleTestCompletion(testId, 'completed');
      
    } catch (error) {
      console.error('Failed to parse Lighthouse output:', error);
      throw error;
    }
  }

  /**
   * Lighthouse 메트릭 추출
   */
  private extractLighthouseMetrics(result: any): Partial<LoadTestResult['metrics']> {
    const metrics: any = {
      performance: {},
      accessibility: {},
      'best-practices': {},
      seo: {}
    };

    console.log('Extracting metrics from result:', {
      hasCategories: !!result.categories,
      hasMetrics: !!result.metrics,
      hasAudits: !!result.audits
    });

    // categories 객체에서 점수 추출 (Lighthouse MCP 응답 구조)
    if (result.categories) {
      console.log('Categories found:', Object.keys(result.categories));
      
      // 성능 점수
      if (result.categories.performance?.score !== undefined) {
        metrics.performance.score = Math.round(result.categories.performance.score * 100);
        console.log('Performance score:', result.categories.performance.score, '->', metrics.performance.score);
      }

      // 접근성 점수
      if (result.categories.accessibility?.score !== undefined) {
        metrics.accessibility.score = Math.round(result.categories.accessibility.score * 100);
        console.log('Accessibility score:', result.categories.accessibility.score, '->', metrics.accessibility.score);
      }

      // 모범 사례 점수
      if (result.categories['best-practices']?.score !== undefined) {
        metrics['best-practices'].score = Math.round(result.categories['best-practices'].score * 100);
        console.log('Best practices score:', result.categories['best-practices'].score, '->', metrics['best-practices'].score);
      }

      // SEO 점수
      if (result.categories.seo?.score !== undefined) {
        metrics.seo.score = Math.round(result.categories.seo.score * 100);
        console.log('SEO score:', result.categories.seo.score, '->', metrics.seo.score);
      }
    }

    // scores 객체에서 점수 추출 (기존 구조 지원)
    if (result.scores) {
      console.log('Scores found:', Object.keys(result.scores));
      
      // 성능 점수
      if (result.scores.performance?.score && !metrics.performance.score) {
        metrics.performance.score = Math.round(result.scores.performance.score * 100);
      }

      // 접근성 점수
      if (result.scores.accessibility?.score && !metrics.accessibility.score) {
        metrics.accessibility.score = Math.round(result.scores.accessibility.score * 100);
      }

      // 모범 사례 점수
      if (result.scores['best-practices']?.score && !metrics['best-practices'].score) {
        metrics['best-practices'].score = Math.round(result.scores['best-practices'].score * 100);
      }

      // SEO 점수
      if (result.scores.seo?.score && !metrics.seo.score) {
        metrics.seo.score = Math.round(result.scores.seo.score * 100);
      }
    }

    // 성능 메트릭 (metrics 객체에서 추출)
    if (result.metrics) {
      console.log('Performance metrics found:', Object.keys(result.metrics));
      
      // First Contentful Paint
      if (result.metrics['first-contentful-paint']?.value) {
        metrics.performance.fcp = Math.round(result.metrics['first-contentful-paint'].value);
        console.log('FCP:', result.metrics['first-contentful-paint'].value, '->', metrics.performance.fcp);
      }

      // Largest Contentful Paint
      if (result.metrics['largest-contentful-paint']?.value) {
        metrics.performance.lcp = Math.round(result.metrics['largest-contentful-paint'].value);
        console.log('LCP:', result.metrics['largest-contentful-paint'].value, '->', metrics.performance.lcp);
      }

      // Total Blocking Time
      if (result.metrics['total-blocking-time']?.value) {
        metrics.performance.tbt = Math.round(result.metrics['total-blocking-time'].value);
        console.log('TBT:', result.metrics['total-blocking-time'].value, '->', metrics.performance.tbt);
      }

      // Cumulative Layout Shift
      if (result.metrics['cumulative-layout-shift']?.value) {
        metrics.performance.cls = result.metrics['cumulative-layout-shift'].value;
        console.log('CLS:', result.metrics['cumulative-layout-shift'].value, '->', metrics.performance.cls);
      }

      // Speed Index
      if (result.metrics['speed-index']?.value) {
        metrics.performance.speedIndex = Math.round(result.metrics['speed-index'].value);
        console.log('Speed Index:', result.metrics['speed-index'].value, '->', metrics.performance.speedIndex);
      }

      // Time to Interactive
      if (result.metrics['interactive']?.value) {
        metrics.performance.tti = Math.round(result.metrics['interactive'].value);
        console.log('TTI:', result.metrics['interactive'].value, '->', metrics.performance.tti);
      }
    }

    // 기존 audits 구조도 지원
    if (result.audits) {
      console.log('Audits found for performance metrics');
      
      // First Contentful Paint
      if (result.audits['first-contentful-paint']?.numericValue && !metrics.performance.fcp) {
        metrics.performance.fcp = Math.round(result.audits['first-contentful-paint'].numericValue);
      }

      // Largest Contentful Paint
      if (result.audits['largest-contentful-paint']?.numericValue && !metrics.performance.lcp) {
        metrics.performance.lcp = Math.round(result.audits['largest-contentful-paint'].numericValue);
      }

      // First Input Delay
      if (result.audits['max-potential-fid']?.numericValue && !metrics.performance.fid) {
        metrics.performance.fid = Math.round(result.audits['max-potential-fid'].numericValue);
      }

      // Cumulative Layout Shift
      if (result.audits['cumulative-layout-shift']?.numericValue && !metrics.performance.cls) {
        metrics.performance.cls = result.audits['cumulative-layout-shift'].numericValue;
      }

      // Speed Index
      if (result.audits['speed-index']?.numericValue && !metrics.performance.speedIndex) {
        metrics.performance.speedIndex = Math.round(result.audits['speed-index'].numericValue);
      }
    }

    console.log('Final extracted metrics:', metrics);
    return metrics;
  }

  /**
   * Lighthouse 요약 정보 추출
   */
  private extractLighthouseSummary(result: any): Partial<LoadTestResult['summary']> {
    const summary: any = {
      score: 0,
      totalScore: 0,
      categoryCount: 0
    };

    let totalScore = 0;
    let categoryCount = 0;

    // 각 카테고리 점수 계산
    if (result.categories) {
      Object.keys(result.categories).forEach(category => {
        const score = result.categories[category]?.score;
        if (score !== undefined) {
          totalScore += score;
          categoryCount++;
        }
      });
    }

    if (categoryCount > 0) {
      summary.score = Math.round((totalScore / categoryCount) * 100);
      summary.totalScore = totalScore;
      summary.categoryCount = categoryCount;
    }

    return summary;
  }

  /**
   * Lighthouse 상세 정보 추출
   */
  private extractLighthouseDetails(result: any): any {
    const details: any = {
      categories: {},
      audits: {},
      timing: {}
    };

    // 카테고리 정보
    if (result.categories) {
      Object.keys(result.categories).forEach(category => {
        details.categories[category] = {
          score: result.categories[category]?.score,
          title: result.categories[category]?.title,
          description: result.categories[category]?.description
        };
      });
    }

    // 감사 결과
    if (result.audits) {
      Object.keys(result.audits).forEach(auditKey => {
        const audit = result.audits[auditKey];
        if (audit) {
          details.audits[auditKey] = {
            title: audit.title,
            description: audit.description,
            score: audit.score,
            displayValue: audit.displayValue,
            details: audit.details
          };
        }
      });
    }

    // 타이밍 정보
    if (result.timing) {
      details.timing = result.timing;
    }

    return details;
  }

  /**
   * Lighthouse 메트릭을 m2_test_metrics에 저장
   */
  private async saveLighthouseMetrics(testId: string, lighthouseResult: any): Promise<void> {
    try {
      const { TestMetricService } = await import('./test-metric-service');
      const testMetricService = new TestMetricService();

      const metricsToSave: any[] = [];

      // categories 객체에서 점수 저장 (Lighthouse MCP 응답 구조)
      if (lighthouseResult.categories) {
        // 성능 점수 저장
        if (lighthouseResult.categories.performance?.score) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'performance_score',
            metric_name: 'Performance Score',
            value: Math.round(lighthouseResult.categories.performance.score * 100),
            unit: 'percent',
            description: 'Lighthouse Performance Score'
          });
        }

        // 접근성 점수 저장
        if (lighthouseResult.categories.accessibility?.score) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'accessibility_score',
            metric_name: 'Accessibility Score',
            value: Math.round(lighthouseResult.categories.accessibility.score * 100),
            unit: 'percent',
            description: 'Lighthouse Accessibility Score'
          });
        }

        // 모범 사례 점수 저장
        if (lighthouseResult.categories['best-practices']?.score) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'best_practices_score',
            metric_name: 'Best Practices Score',
            value: Math.round(lighthouseResult.categories['best-practices'].score * 100),
            unit: 'percent',
            description: 'Lighthouse Best Practices Score'
          });
        }

        // SEO 점수 저장
        if (lighthouseResult.categories.seo?.score) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'seo_score',
            metric_name: 'SEO Score',
            value: Math.round(lighthouseResult.categories.seo.score * 100),
            unit: 'percent',
            description: 'Lighthouse SEO Score'
          });
        }
      }

      // scores 객체에서 점수 저장 (기존 구조 지원)
      if (lighthouseResult.scores) {
        // 성능 점수 저장
        if (lighthouseResult.scores.performance?.score) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'performance_score',
            metric_name: 'Performance Score',
            value: Math.round(lighthouseResult.scores.performance.score * 100),
            unit: 'percent',
            description: 'Lighthouse Performance Score'
          });
        }

        // 접근성 점수 저장
        if (lighthouseResult.scores.accessibility?.score) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'accessibility_score',
            metric_name: 'Accessibility Score',
            value: Math.round(lighthouseResult.scores.accessibility.score * 100),
            unit: 'percent',
            description: 'Lighthouse Accessibility Score'
          });
        }

        // 모범 사례 점수 저장
        if (lighthouseResult.scores['best-practices']?.score) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'best_practices_score',
            metric_name: 'Best Practices Score',
            value: Math.round(lighthouseResult.scores['best-practices'].score * 100),
            unit: 'percent',
            description: 'Lighthouse Best Practices Score'
          });
        }

        // SEO 점수 저장
        if (lighthouseResult.scores.seo?.score) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'seo_score',
            metric_name: 'SEO Score',
            value: Math.round(lighthouseResult.scores.seo.score * 100),
            unit: 'percent',
            description: 'Lighthouse SEO Score'
          });
        }
      }

      // 성능 메트릭 저장
      if (lighthouseResult.metrics) {
        // First Contentful Paint
        if (lighthouseResult.metrics['first-contentful-paint']?.value) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'performance_metric',
            metric_name: 'First Contentful Paint',
            value: Math.round(lighthouseResult.metrics['first-contentful-paint'].value),
            unit: 'ms',
            description: 'Time to first contentful paint'
          });
        }

        // Largest Contentful Paint
        if (lighthouseResult.metrics['largest-contentful-paint']?.value) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'performance_metric',
            metric_name: 'Largest Contentful Paint',
            value: Math.round(lighthouseResult.metrics['largest-contentful-paint'].value),
            unit: 'ms',
            description: 'Time to largest contentful paint'
          });
        }

        // Total Blocking Time
        if (lighthouseResult.metrics['total-blocking-time']?.value) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'performance_metric',
            metric_name: 'Total Blocking Time',
            value: Math.round(lighthouseResult.metrics['total-blocking-time'].value),
            unit: 'ms',
            description: 'Total time spent blocking the main thread'
          });
        }

        // Cumulative Layout Shift
        if (lighthouseResult.metrics['cumulative-layout-shift']?.value) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'performance_metric',
            metric_name: 'Cumulative Layout Shift',
            value: lighthouseResult.metrics['cumulative-layout-shift'].value,
            unit: 'score',
            description: 'Cumulative layout shift score'
          });
        }

        // Speed Index
        if (lighthouseResult.metrics['speed-index']?.value) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'performance_metric',
            metric_name: 'Speed Index',
            value: Math.round(lighthouseResult.metrics['speed-index'].value),
            unit: 'ms',
            description: 'Speed index measurement'
          });
        }

        // Time to Interactive
        if (lighthouseResult.metrics['interactive']?.value) {
          metricsToSave.push({
            test_id: testId,
            metric_type: 'performance_metric',
            metric_name: 'Time to Interactive',
            value: Math.round(lighthouseResult.metrics['interactive'].value),
            unit: 'ms',
            description: 'Time until the page becomes interactive'
          });
        }
      }

      // 메트릭들을 데이터베이스에 저장
      if (metricsToSave.length > 0) {
        await testMetricService.saveMetrics(metricsToSave);
      }

      console.log(`Saved ${metricsToSave.length} Lighthouse metrics to database`);

    } catch (error) {
      console.error('Failed to save Lighthouse metrics:', error);
      throw error;
    }
  }

  /**
   * Lighthouse 결과 저장
   */
  private async saveLighthouseResult(
    id: string,
    testId: string, 
    metrics: Partial<LoadTestResult['metrics']>, 
    summary: Partial<LoadTestResult['summary']>, 
    details: any, 
    rawData: string, 
    config?: LoadTestConfig
  ): Promise<void> {
    try {
      // TestResultService를 통해 결과 저장
      const { TestResultService } = await import('./test-result-service');
      const testResultService = new TestResultService();

      console.log('Saving Lighthouse result with metrics:', metrics);
      console.log('Raw data length:', rawData.length);

      const testResult: any = {
        id: id, // 전달받은 UUID 사용
        testId: testId, // Lighthouse 형식의 test_id 사용
        testType: 'lighthouse',
        url: (config as any).url || (config as any).targetUrl || '',
        name: '', // name 필드는 비워두고 description만 사용
        description: `Lighthouse performance audit for ${(config as any).url || 'Unknown URL'}`,
        status: 'completed' as const,
        currentStep: 'Lighthouse 테스트 완료',
        summary: summary,
        metrics: metrics,
        details: details,
        config: config || {},
        raw_data: rawData, // 원본 Lighthouse 결과를 직접 사용
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await testResultService.saveResult(testResult);
      console.log('Lighthouse test result saved successfully');

    } catch (error) {
      console.error('Failed to save Lighthouse test result:', error);
      throw error;
    }
  }

  /**
   * 테스트 취소
   */
  async cancelTest(testId: string): Promise<void> {
    const test = this.runningTests.get(testId);
    if (test) {
      // Lighthouse 프로세스 종료 로직 (필요시 구현)
      this.runningTests.delete(testId);
      this.handleTestCompletion(testId, 'cancelled');
    }
  }

  /**
   * 테스트 완료 처리
   */
  private handleTestCompletion(testId: string, status: LoadTestResult['status']): void {
    const test = this.runningTests.get(testId);
    if (test) {
      test.status = status;
      test.endTime = new Date();
      this.runningTests.delete(testId);
      console.log(`Lighthouse test ${testId} completed with status: ${status}`);
    }
  }

  /**
   * 실행 중인 테스트 목록 조회
   */
  getRunningTests(): string[] {
    return Array.from(this.runningTests.keys());
  }

  /**
   * 테스트 실행 중 여부 확인
   */
  isTestRunning(testId: string): boolean {
    return this.runningTests.has(testId);
  }

  /**
   * 테스트 결과 조회
   */
  getTestResult(testId: string): any {
    return this.testResults.get(testId);
  }
} 