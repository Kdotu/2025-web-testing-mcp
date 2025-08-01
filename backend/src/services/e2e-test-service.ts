import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { TestResultService } from './test-result-service';

interface E2ETestConfig {
  url: string;
  name: string;
  description?: string;
  config: {
    testType: string;
    settings: any;
  };
}

interface E2ETestLocalResult {
  id: string;
  url: string;
  name: string;
  description?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  logs: string[];
  results?: any;
  error?: string;
}

export class E2ETestService {
  private runningTests: Map<string, E2ETestLocalResult> = new Map();
  private tempDir: string;
  private testResultService: TestResultService;

  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // 녹화 파일 저장 디렉토리 생성
    const recordingsDir = path.join(this.tempDir, 'recordings');
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }
    
    this.testResultService = new TestResultService();
  }

  /**
   * E2E 테스트 실행
   */
  async executeE2ETest(config: E2ETestConfig): Promise<E2ETestLocalResult> {
    const testId = uuidv4();
          const testResult: E2ETestLocalResult = {
      id: testId,
      url: config.url,
      name: config.name,
      status: 'running',
      startTime: new Date().toISOString(),
      logs: [],
      ...(config.description && { description: config.description })
    };

    this.runningTests.set(testId, testResult);

    // DB에 초기 결과 저장
    await this.saveInitialResult(testId, config);

    // Playwright MCP 서버를 사용하여 E2E 테스트 실행
    this.runPlaywrightTest(testId, config);

    return testResult;
  }

  /**
   * Playwright를 통한 E2E 테스트 실행
   */
  private async runPlaywrightTest(testId: string, config: E2ETestConfig) {
    const testResult = this.runningTests.get(testId);
    if (!testResult) return;

    try {
      // Playwright 스크립트 생성
      const scriptContent = this.generatePlaywrightScript(config);
      const scriptPath = path.join(this.tempDir, `${testId}.js`);
      
      fs.writeFileSync(scriptPath, scriptContent);

      testResult.logs.push('Playwright 테스트를 시작합니다...');

      // Playwright 스크립트 실행
      const playwrightProcess = spawn('node', [scriptPath], {
        cwd: this.tempDir,
        env: {
          ...process.env,
          PLAYWRIGHT_TEST_URL: config.url,
          PLAYWRIGHT_CONFIG: JSON.stringify(config.config.settings)
        }
      });

      playwrightProcess.stdout?.on('data', (data) => {
        const log = data.toString().trim();
        testResult.logs.push(log);
        console.log(`[E2E Test ${testId}] ${log}`);
      });

      playwrightProcess.stderr?.on('data', (data) => {
        const log = data.toString().trim();
        testResult.logs.push(`ERROR: ${log}`);
        console.error(`[E2E Test ${testId}] ERROR: ${log}`);
      });

      playwrightProcess.on('close', async (code) => {
        if (code === 0) {
          testResult.status = 'completed';
          testResult.endTime = new Date().toISOString();
          testResult.logs.push('E2E 테스트가 성공적으로 완료되었습니다.');
          
          // DB 업데이트
          await this.updateTestResult(testId, 'completed', testResult.logs, config);
          console.log(`[E2E Test ${testId}] 테스트 완료 - DB 업데이트 완료`);
        } else {
          testResult.status = 'failed';
          testResult.endTime = new Date().toISOString();
          testResult.error = `테스트가 코드 ${code}로 종료되었습니다.`;
          testResult.logs.push(`E2E 테스트가 실패했습니다. (코드: ${code})`);
          
          // DB 업데이트
          await this.updateTestResult(testId, 'failed', testResult.logs, config);
          console.log(`[E2E Test ${testId}] 테스트 실패 - DB 업데이트 완료`);
        }
      });

      playwrightProcess.on('error', async (error) => {
        testResult.status = 'failed';
        testResult.endTime = new Date().toISOString();
        testResult.error = error.message;
        testResult.logs.push(`E2E 테스트 실행 중 오류 발생: ${error.message}`);
        
        // DB 업데이트
        await this.updateTestResult(testId, 'failed', testResult.logs, config);
        console.log(`[E2E Test ${testId}] 테스트 오류 - DB 업데이트 완료`);
      });

    } catch (error: any) {
      testResult.status = 'failed';
      testResult.endTime = new Date().toISOString();
      testResult.error = error.message;
      testResult.logs.push(`E2E 테스트 초기화 중 오류 발생: ${error.message}`);
      
      // DB 업데이트
      await this.updateTestResult(testId, 'failed', testResult.logs, config);
      console.log(`[E2E Test ${testId}] 테스트 초기화 오류 - DB 업데이트 완료`);
    }
  }

  /**
   * Playwright 스크립트 생성
   */
  private generatePlaywrightScript(config: E2ETestConfig): string {
    const settings = config.config.settings;
    const testId = config.url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    
    return `
const { chromium, firefox, webkit } = require('playwright');
const path = require('path');

async function runE2ETest() {
  const browserType = process.env.PLAYWRIGHT_BROWSER || '${settings.browser || 'chromium'}';
  const browser = await getBrowser(browserType);
  
  // 녹화 파일 경로 설정
  const recordingsDir = path.join(__dirname, 'recordings');
  
  let page;
  try {
    const context = await browser.newContext({
      viewport: { width: ${settings.viewport?.width || 1280}, height: ${settings.viewport?.height || 720} },
      headless: ${settings.headless !== false},
      timeout: ${settings.timeout || 30000},
      navigationTimeout: ${settings.navigationTimeout || 30000},
      actionTimeout: ${settings.actionTimeout || 5000},
      locale: '${settings.locale || 'ko-KR'}',
      timezoneId: '${settings.timezone || 'Asia/Seoul'}',
      ${settings.userAgent ? `userAgent: '${settings.userAgent}',` : ''}
      ${settings.geolocation ? `geolocation: ${JSON.stringify(settings.geolocation)},` : ''}
      ${settings.permissions ? `permissions: ${JSON.stringify(settings.permissions)},` : ''}
      ${settings.colorScheme ? `colorScheme: '${settings.colorScheme}',` : ''}
      ${settings.reducedMotion ? `reducedMotion: 'reduce',` : ''}
      ${settings.forcedColors ? `forcedColors: '${settings.forcedColors}',` : ''}
      acceptDownloads: ${settings.acceptDownloads !== false},
      ignoreHTTPSErrors: ${settings.ignoreHttpsErrors || false},
      bypassCSP: ${settings.bypassCSP || false},
      ${settings.extraHttpHeaders ? `extraHTTPHeaders: ${JSON.stringify(settings.extraHttpHeaders)},` : ''}
      ${settings.httpCredentials?.username ? `httpCredentials: { username: '${settings.httpCredentials.username}', password: '${settings.httpCredentials.password}' },` : ''}
      ${settings.proxy?.server ? `proxy: { server: '${settings.proxy.server}', bypass: '${settings.proxy.bypass}', username: '${settings.proxy.username}', password: '${settings.proxy.password}' },` : ''}
      ${settings.videoRecording ? `recordVideo: { dir: recordingsDir, size: { width: ${settings.viewport?.width || 1280}, height: ${settings.viewport?.height || 720} } },` : ''}
      ${settings.traceRecording ? `recordHar: { path: path.join(recordingsDir, '${testId}-har.har') },` : ''}
    });

    const page = await context.newPage();
    
    console.log('페이지 로딩 중...');
    await page.goto('${config.url}', { timeout: ${settings.navigationTimeout || 30000} });
    
    console.log('페이지 제목 확인 중...');
    await page.waitForLoadState('networkidle', { timeout: ${settings.navigationTimeout || 30000} });
    
    console.log('기본 상호작용 테스트 중...');
    
    // 링크 클릭 테스트
    const firstLink = page.locator('a').first();
    if (await firstLink.count() > 0) {
      console.log('첫 번째 링크 클릭 테스트...');
      await firstLink.click({ timeout: ${settings.actionTimeout || 5000} });
      await page.waitForLoadState('networkidle', { timeout: ${settings.navigationTimeout || 30000} });
      await page.goBack();
    }
    
    // 폼 입력 테스트
    const firstInput = page.locator('input[type="text"], input[type="email"], input[type="password"]').first();
    if (await firstInput.count() > 0) {
      console.log('폼 입력 테스트...');
      await firstInput.fill('test@example.com', { timeout: ${settings.actionTimeout || 5000} });
    }
    
    // 버튼 클릭 테스트
    const firstButton = page.locator('button').first();
    if (await firstButton.count() > 0) {
      console.log('버튼 클릭 테스트...');
      await firstButton.click({ timeout: ${settings.actionTimeout || 5000} });
      await page.waitForTimeout(1000);
    }
    
    console.log('E2E 테스트 완료!');
    
  } catch (error) {
    console.error('E2E 테스트 실패:', error);
    
    // 실패 시 스크린샷 캡처
    if (${settings.screenshotOnFailure} && page) {
      try {
        const screenshotPath = path.join(recordingsDir, '${testId}-screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('실패 스크린샷 저장:', screenshotPath);
      } catch (screenshotError) {
        console.error('스크린샷 캡처 실패:', screenshotError);
      }
    }
    
    throw error;
  } finally {
    // 녹화 파일 정보 로그
    if (${settings.videoRecording}) {
      console.log('비디오 녹화 파일 저장됨:', path.join(recordingsDir, '${testId}-video.webm'));
    }
    if (${settings.traceRecording}) {
      console.log('HAR 파일 저장됨:', path.join(recordingsDir, '${testId}-har.har'));
    }
    
    await browser.close();
  }
}

async function getBrowser(type) {
  switch (type) {
    case 'firefox':
      return await firefox.launch();
    case 'webkit':
      return await webkit.launch();
    default:
      return await chromium.launch();
  }
}

runE2ETest().catch(console.error);
`;
  }

  /**
   * E2E 테스트 상태 조회
   */
  async getE2ETestStatus(testId: string): Promise<E2ETestLocalResult | null> {
    return this.runningTests.get(testId) || null;
  }

  /**
   * 초기 결과를 DB에 저장
   */
  private async saveInitialResult(testId: string, config: E2ETestConfig): Promise<void> {
    try {
      const initialResult = {
        id: uuidv4(),
        testId,
        testType: 'e2e',
        url: config.url,
        name: config.name,
        ...(config.description && { description: config.description }),
        status: 'running' as const,
        currentStep: '테스트 시작',
        metrics: {
          http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
          http_req_rate: 0,
          http_req_failed: 0,
          vus: 0,
          vus_max: 0
        },
        summary: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          duration: 0,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString()
        },
        details: {},
        config: config.config,
        raw_data: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log(`[E2E Test ${testId}] 초기 결과 저장 시작:`, {
        testId,
        url: config.url,
        name: config.name,
        testType: 'e2e'
      });

      await this.testResultService.saveResult(initialResult);
      console.log(`[E2E Test ${testId}] 초기 결과 DB 저장 완료`);
    } catch (error) {
      console.error(`[E2E Test ${testId}] 초기 결과 저장 실패:`, error);
    }
  }

  /**
   * 녹화 파일 정보 수집
   */
  private async collectRecordingFiles(testId: string, config: E2ETestConfig): Promise<{
    videoFile?: string;
    screenshotFile?: string;
    harFile?: string;
  }> {
    const recordingsDir = path.join(this.tempDir, 'recordings');
    const urlId = config.url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    
    const recordingInfo: any = {};
    
    // 비디오 파일 확인
    if (config.config.settings.videoRecording) {
      const videoPath = path.join(recordingsDir, `${urlId}-video.webm`);
      if (fs.existsSync(videoPath)) {
        recordingInfo.videoFile = videoPath;
        console.log(`[E2E Test ${testId}] 비디오 파일 발견:`, videoPath);
      }
    }
    
    // 스크린샷 파일 확인
    if (config.config.settings.screenshotOnFailure) {
      const screenshotPath = path.join(recordingsDir, `${urlId}-screenshot.png`);
      if (fs.existsSync(screenshotPath)) {
        recordingInfo.screenshotFile = screenshotPath;
        console.log(`[E2E Test ${testId}] 스크린샷 파일 발견:`, screenshotPath);
      }
    }
    
    // HAR 파일 확인
    if (config.config.settings.traceRecording) {
      const harPath = path.join(recordingsDir, `${urlId}-har.har`);
      if (fs.existsSync(harPath)) {
        recordingInfo.harFile = harPath;
        console.log(`[E2E Test ${testId}] HAR 파일 발견:`, harPath);
      }
    }
    
    return recordingInfo;
  }

  /**
   * E2E 테스트용 raw_data 생성
   */
  private async generateE2ERawData(testId: string, logs: string[], config: E2ETestConfig, status: string): Promise<string> {
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
      configInfo += `Test Type: E2E Test\n`;
      configInfo += `URL: ${config.url}\n`;
      configInfo += `Name: ${config.name}\n`;
      if (config.description) {
        configInfo += `Description: ${config.description}\n`;
      }
      if (config.config?.settings) {
        configInfo += `Browser: ${config.config.settings.browser || 'chromium'}\n`;
        configInfo += `Headless: ${config.config.settings.headless !== false}\n`;
        configInfo += `Viewport: ${config.config.settings.viewport?.width || 1280}x${config.config.settings.viewport?.height || 720}\n`;
        configInfo += `Timeout: ${config.config.settings.timeout || 30000}ms\n`;
        configInfo += `Video Recording: ${config.config.settings.videoRecording || false}\n`;
        configInfo += `Trace Recording: ${config.config.settings.traceRecording || false}\n`;
        configInfo += `Screenshot On Failure: ${config.config.settings.screenshotOnFailure || false}\n`;
        configInfo += `Settings: ${JSON.stringify(config.config.settings, null, 2)}\n`;
      }
      configInfo += `------------------------------------\n\n`;
    }
    
    // 녹화 파일 정보 수집
    let recordingInfo = '';
    if (config) {
      const recordingFiles = await this.collectRecordingFiles(testId, config);
      if (Object.keys(recordingFiles).length > 0) {
        recordingInfo = `------------------------------------\n-------RECORDING FILES-------\n`;
        if (recordingFiles.videoFile) {
          recordingInfo += `Video File: ${recordingFiles.videoFile}\n`;
        }
        if (recordingFiles.screenshotFile) {
          recordingInfo += `Screenshot File: ${recordingFiles.screenshotFile}\n`;
        }
        if (recordingFiles.harFile) {
          recordingInfo += `HAR File: ${recordingFiles.harFile}\n`;
        }
        recordingInfo += `------------------------------------\n\n`;
      }
    }
    
    // 테스트 결과 요약
    const resultSummary = `------------------------------------\n-------TEST RESULT-------\n`;
    const resultSummary2 = `Status: ${status}\n`;
    const resultSummary3 = `Total Logs: ${logs.length}\n`;
    const resultSummary4 = `Test ID: ${testId}\n`;
    const resultSummary5 = `------------------------------------\n\n`;
    
    // 로그 내용
    const logsContent = logs.join('\n');
    
    return timestampLine + configInfo + recordingInfo + resultSummary + resultSummary2 + resultSummary3 + resultSummary4 + resultSummary5 + logsContent;
  }

  /**
   * 테스트 완료 시 DB 업데이트
   */
  private async updateTestResult(testId: string, status: 'completed' | 'failed' | 'cancelled', logs: string[], config?: E2ETestConfig): Promise<void> {
    try {
      console.log(`[E2E Test ${testId}] DB 업데이트 시작 - 상태: ${status}`);
      
      // 녹화 파일 정보 수집
      let recordingFiles = {};
      if (config) {
        recordingFiles = await this.collectRecordingFiles(testId, config);
      }
      
      const existingResult = await this.testResultService.getResultByTestId(testId);
      console.log(`[E2E Test ${testId}] 기존 결과 조회:`, existingResult ? '존재함' : '존재하지 않음');
      
      if (existingResult) {
        const updatedResult = {
          ...existingResult,
          status,
          currentStep: status === 'completed' ? '테스트 완료' : '테스트 실패',
          summary: {
            ...existingResult.summary,
            endTime: new Date().toISOString(),
            duration: existingResult.summary?.startTime 
              ? new Date().getTime() - new Date(existingResult.summary.startTime).getTime()
              : 0
          },
          details: {
            ...existingResult.details,
            logs,
            recordingFiles,
            completedAt: new Date().toISOString()
          },
          raw_data: config ? await this.generateE2ERawData(testId, logs, config, status) : logs.join('\n'),
          updatedAt: new Date().toISOString()
        };

        console.log(`[E2E Test ${testId}] 업데이트할 결과:`, {
          status: updatedResult.status,
          currentStep: updatedResult.currentStep,
          logsCount: logs.length,
          rawDataLength: updatedResult.raw_data?.length || 0,
          recordingFiles: Object.keys(recordingFiles)
        });

        await this.testResultService.updateResult(updatedResult);
        console.log(`[E2E Test ${testId}] DB 업데이트 완료`);
      } else {
        console.error(`[E2E Test ${testId}] 기존 결과를 찾을 수 없습니다.`);
      }
    } catch (error) {
      console.error(`[E2E Test ${testId}] DB 업데이트 실패:`, error);
    }
  }

  /**
   * E2E 테스트 취소
   */
  async cancelE2ETest(testId: string): Promise<void> {
    const testResult = this.runningTests.get(testId);
    if (testResult && testResult.status === 'running') {
      testResult.status = 'cancelled';
      testResult.endTime = new Date().toISOString();
      testResult.logs.push('사용자에 의해 테스트가 취소되었습니다.');
      
      // DB 업데이트 (cancel의 경우 config 정보가 없으므로 빈 객체 전달)
      await this.updateTestResult(testId, 'cancelled', testResult.logs, {
        url: testResult.url,
        name: testResult.name,
        ...(testResult.description && { description: testResult.description }),
        config: { testType: 'e2e', settings: {} }
      });
    }
  }
} 