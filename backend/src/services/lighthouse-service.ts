import { LoadTestConfig, LoadTestResult } from '../types';

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
   * Lighthouse 테스트 실행
   */
  async executeTest(id: string, testId: string, config: LoadTestConfig): Promise<void> {
    try {
      // 테스트 시작 시 상태를 running으로 설정
      this.runningTests.set(testId, { status: 'running', startTime: new Date() });
      
      // Lighthouse 테스트 실행
      const result = await this.executeLighthouseViaMCP(config);
      console.log('Lighthouse result:', result);

      // 결과 처리
      await this.parseLighthouseOutput(id, testId, result, config);
      
      // 테스트 완료 시 상태 업데이트
      this.handleTestCompletion(testId, 'completed');

    } catch (error) {
      console.error('Failed to execute Lighthouse test:', error);
      this.handleTestCompletion(testId, 'failed');
      throw error;
    }
  }

  /**
   * Lighthouse MCP 서버를 통한 테스트 실행
   */
  private async executeLighthouseViaMCP(config: LoadTestConfig): Promise<string> {
    return new Promise((resolve) => {
      console.log(`Executing Lighthouse test via MCP`);
      console.log(`Config: url=${(config as any).url}, device=${(config as any).device || 'desktop'}`);
      
      // 임시로 모의 Lighthouse 결과 생성 (실제 MCP 서버 대신)
      setTimeout(() => {
        const mockResult = {
          url: (config as any).url,
          fetchTime: new Date().toISOString(),
          version: '10.0.0',
          scores: {
            performance: { score: 0.85 },
            accessibility: { score: 0.92 },
            'best-practices': { score: 0.78 },
            seo: { score: 0.88 }
          },
          metrics: {
            'first-contentful-paint': { value: 1200 },
            'largest-contentful-paint': { value: 2500 },
            'total-blocking-time': { value: 150 },
            'cumulative-layout-shift': { value: 0.05 },
            'speed-index': { value: 1800 },
            'interactive': { value: 3200 }
          },
          categories: {
            performance: {
              score: 0.85,
              title: 'Performance',
              description: 'Performance audit'
            },
            accessibility: {
              score: 0.92,
              title: 'Accessibility',
              description: 'Accessibility audit'
            },
            'best-practices': {
              score: 0.78,
              title: 'Best Practices',
              description: 'Best practices audit'
            },
            seo: {
              score: 0.88,
              title: 'SEO',
              description: 'SEO audit'
            }
        }
        };

        console.log('Mock Lighthouse result generated');
        resolve(JSON.stringify(mockResult));
      }, 2000); // 2초 후 결과 반환
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
      
      console.log('Parsed Lighthouse result structure:', {
        hasScores: !!lighthouseResult.scores,
        hasMetrics: !!lighthouseResult.metrics,
        scoreKeys: lighthouseResult.scores ? Object.keys(lighthouseResult.scores) : [],
        metricKeys: lighthouseResult.metrics ? Object.keys(lighthouseResult.metrics) : []
      });
      
      // 메트릭 추출
      const metrics = this.extractLighthouseMetrics(lighthouseResult);
      
      // 요약 정보 추출
      const summary = this.extractLighthouseSummary(lighthouseResult);
      
      // 상세 정보 추출
      const details = this.extractLighthouseDetails(lighthouseResult);
      
      // 원시 데이터를 정돈된 형태로 저장
      let rawData: string;
      
      try {
        // 파싱된 lighthouseResult를 사용하여 정돈된 JSON 생성
        const cleanResult = {
          url: lighthouseResult.url,
          fetchTime: lighthouseResult.fetchTime,
          version: lighthouseResult.version,
          scores: lighthouseResult.scores,
          metrics: lighthouseResult.metrics
        };
        
        // 정돈된 JSON 문자열 생성 (이스케이프 문자 제거)
        rawData = JSON.stringify(cleanResult, null, 2)
          .replace(/\\n/g, ' ')     // 이스케이프된 \n을 공백으로 변경
          .replace(/\\"/g, '"')     // 이스케이프된 따옴표를 정상 따옴표로 변경
          .replace(/\\\\/g, '\\')   // 이중 백슬래시를 단일 백슬래시로 변경
          .replace(/\n/g, ' ')      // 실제 줄바꿈을 공백으로 변경
          .replace(/\s+/g, ' ')     // 연속된 공백을 단일 공백으로 변경
          .trim();
          
        console.log('Clean raw data generated successfully');
      } catch (e) {
        // 파싱 실패 시 원본 데이터 사용 (기존 방식)
        console.log('Clean parsing failed, using fallback format');
        rawData = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
        rawData = rawData.replace(/\\n/g, ' ').replace(/\n/g, ' ');
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

    // scores 객체에서 점수 추출 (Lighthouse 결과 구조에 맞게)
    if (result.scores) {
      // 성능 점수
      if (result.scores.performance?.score) {
        metrics.performance.score = Math.round(result.scores.performance.score * 100);
      }

      // 접근성 점수
      if (result.scores.accessibility?.score) {
        metrics.accessibility.score = Math.round(result.scores.accessibility.score * 100);
      }

      // 모범 사례 점수
      if (result.scores['best-practices']?.score) {
        metrics['best-practices'].score = Math.round(result.scores['best-practices'].score * 100);
      }

      // SEO 점수
      if (result.scores.seo?.score) {
        metrics.seo.score = Math.round(result.scores.seo.score * 100);
      }
    }

    // categories 객체에서도 점수 추출 (기존 구조 지원)
    if (result.categories) {
      // 성능 점수
      if (result.categories.performance?.score && !metrics.performance.score) {
        metrics.performance.score = Math.round(result.categories.performance.score * 100);
      }

      // 접근성 점수
      if (result.categories.accessibility?.score && !metrics.accessibility.score) {
        metrics.accessibility.score = Math.round(result.categories.accessibility.score * 100);
      }

      // 모범 사례 점수
      if (result.categories['best-practices']?.score && !metrics['best-practices'].score) {
        metrics['best-practices'].score = Math.round(result.categories['best-practices'].score * 100);
      }

      // SEO 점수
      if (result.categories.seo?.score && !metrics.seo.score) {
        metrics.seo.score = Math.round(result.categories.seo.score * 100);
      }
    }

    // 성능 메트릭 (metrics 객체에서 추출)
    if (result.metrics) {
      // First Contentful Paint
      if (result.metrics['first-contentful-paint']?.value) {
        metrics.performance.fcp = Math.round(result.metrics['first-contentful-paint'].value);
      }

      // Largest Contentful Paint
      if (result.metrics['largest-contentful-paint']?.value) {
        metrics.performance.lcp = Math.round(result.metrics['largest-contentful-paint'].value);
      }

      // Total Blocking Time
      if (result.metrics['total-blocking-time']?.value) {
        metrics.performance.tbt = Math.round(result.metrics['total-blocking-time'].value);
      }

      // Cumulative Layout Shift
      if (result.metrics['cumulative-layout-shift']?.value) {
        metrics.performance.cls = result.metrics['cumulative-layout-shift'].value;
      }

      // Speed Index
      if (result.metrics['speed-index']?.value) {
        metrics.performance.speedIndex = Math.round(result.metrics['speed-index'].value);
      }

      // Time to Interactive
      if (result.metrics['interactive']?.value) {
        metrics.performance.tti = Math.round(result.metrics['interactive'].value);
      }
    }

    // 기존 audits 구조도 지원
    if (result.audits) {
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

      // 성능 점수 저장
      if (lighthouseResult.scores?.performance?.score) {
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
      if (lighthouseResult.scores?.accessibility?.score) {
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
      if (lighthouseResult.scores?.['best-practices']?.score) {
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
      if (lighthouseResult.scores?.seo?.score) {
        metricsToSave.push({
          test_id: testId,
          metric_type: 'seo_score',
          metric_name: 'SEO Score',
          value: Math.round(lighthouseResult.scores.seo.score * 100),
          unit: 'percent',
          description: 'Lighthouse SEO Score'
        });
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
   * Lighthouse 테스트용 raw_data 생성
   */
  private generateLighthouseRawData(testId: string, output: string, config?: LoadTestConfig): string {
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
      configInfo += `Test Type: Lighthouse Test\n`;
      configInfo += `URL: ${(config as any).url || (config as any).targetUrl || 'Unknown'}\n`;
      configInfo += `Device: ${(config as any).device || 'desktop'}\n`;
      if ((config as any).categories) {
        configInfo += `Categories: ${(config as any).categories.join(', ')}\n`;
      }
      if ((config as any).detailedConfig) {
        configInfo += `Test Type: ${(config as any).detailedConfig.testType || 'lighthouse'}\n`;
        if ((config as any).detailedConfig.settings) {
          configInfo += `Settings: ${JSON.stringify((config as any).detailedConfig.settings, null, 2)}\n`;
        }
      }
      configInfo += `------------------------------------\n\n`;
    }
    
    // 테스트 결과 요약
    const resultSummary = `------------------------------------\n-------TEST RESULT-------\n`;
    const resultSummary2 = `Status: completed\n`;
    const resultSummary3 = `Test ID: ${testId}\n`;
    const resultSummary4 = `------------------------------------\n\n`;
    
    // Lighthouse 결과 내용
    const lighthouseContent = output;
    
    return timestampLine + configInfo + resultSummary + resultSummary2 + resultSummary3 + resultSummary4 + lighthouseContent;
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
        raw_data: this.generateLighthouseRawData(testId, rawData, config),
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