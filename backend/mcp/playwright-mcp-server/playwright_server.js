#!/usr/bin/env node

/**
 * Playwright MCP Server
 * JSON 기반 stdin/stdout 통신을 사용하여 Playwright 테스트 실행
 * 테스트 시나리오 실행 및 기본 E2E 테스트 지원
 */

const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// stdin/stdout 인터페이스 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

/**
 * 테스트 시나리오 실행 (사용자 정의 코드)
 */
async function executePlaywrightScenario(scenarioCode, config = {}) {
  return new Promise((resolve, reject) => {
    console.error(`[Playwright] Executing custom scenario`);
    console.error(`[Playwright] Config:`, config);
    
    // 임시 스크립트 파일 생성 (사용자 시나리오 코드 사용)
    const scriptContent = generateScenarioScript(scenarioCode, config);
    const scriptPath = path.join(__dirname, `scenario_script_${Date.now()}.js`);
    
    try {
      fs.writeFileSync(scriptPath, scriptContent);
      console.error(`[Playwright] Scenario script written to: ${scriptPath}`);
    } catch (error) {
      reject(new Error(`Failed to write scenario script file: ${error.message}`));
      return;
    }
    
    // Node.js로 직접 스크립트 실행
    const isWindows = process.platform === 'win32';
    let command;
    let commandArgs;
    
    if (isWindows) {
      command = 'cmd';
      commandArgs = ['/c', 'npx', 'playwright', 'install', 'chromium', '&&', 'node', scriptPath];
    } else {
      command = 'bash';
      commandArgs = ['-c', 'npx playwright install chromium && node ' + scriptPath];
    }
    
    console.error(`[Playwright] Executing: ${command} ${commandArgs.join(' ')}`);
    
    const playwrightProcess = spawn(command, commandArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows,
      env: {
        ...process.env,
        CI: 'true',
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0'
      }
    });
    
    let output = '';
    let errorOutput = '';
    let logs = [];
    
    playwrightProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      const lines = dataStr.trim().split('\n').filter(line => line.trim());
      logs.push(...lines);
      console.error(`[Playwright] stdout: ${dataStr.trim()}`);
      
      // 상세 실행 로그 출력
      if (dataStr.includes('🚀') || dataStr.includes('✅') || dataStr.includes('❌') || dataStr.includes('🖱️')) {
        console.error(`[Playwright] 실행 단계: ${dataStr.trim()}`);
      }
    });
    
    playwrightProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      const lines = dataStr.trim().split('\n').filter(line => line.trim());
      logs.push(...lines);
      console.error(`[Playwright] stderr: ${dataStr.trim()}`);
    });
    
    playwrightProcess.on('close', (code) => {
      console.error(`[Playwright] Process exited with code: ${code}`);
      
      // 임시 파일 정리
      try {
        fs.unlinkSync(scriptPath);
      } catch (error) {
        console.error(`[Playwright] Failed to cleanup script file: ${error.message}`);
      }
      
      if (code === 0) {
        try {
          // JSON 결과 파싱
          const lines = output.trim().split('\n');
          const jsonLine = lines.find(line => line.startsWith('{') && line.endsWith('}'));
          if (jsonLine) {
            const result = JSON.parse(jsonLine);
            console.error(`[Playwright] Scenario completed successfully`);
            resolve({
              ...result,
              logs: logs,
              executionTime: new Date().toISOString()
            });
          } else {
            // JSON 결과가 없는 경우 기본 결과 생성
            const defaultResult = {
              success: true,
              logs: logs,
              output: output,
              executionTime: new Date().toISOString()
            };
            resolve(defaultResult);
          }
        } catch (error) {
          console.error(`[Playwright] Failed to parse JSON output: ${error.message}`);
          // 파싱 실패 시에도 기본 결과 반환
          const fallbackResult = {
            success: true,
            logs: logs,
            output: output,
            executionTime: new Date().toISOString()
          };
          resolve(fallbackResult);
        }
      } else {
        console.error(`[Playwright] Process failed with code: ${code}`);
        const errorResult = {
          success: false,
          error: `Process failed with code: ${code}`,
          logs: logs,
          errorOutput: errorOutput,
          executionTime: new Date().toISOString()
        };
        resolve(errorResult);
      }
    });
    
    playwrightProcess.on('error', (error) => {
      console.error(`[Playwright] Failed to start Playwright process: ${error.message}`);
      const errorResult = {
        success: false,
        error: `Failed to start Playwright: ${error.message}`,
        executionTime: new Date().toISOString()
      };
      resolve(errorResult);
    });
  });
}

/**
 * 시나리오 스크립트 생성
 */
function generateScenarioScript(scenarioCode, config) {
  // 사용자가 작성한 스크립트를 그대로 실행 파일로 저장
  return String(scenarioCode ?? '');
}

/**
 * Playwright 테스트 실행 (직접 API 사용) - 기존 기능 유지
 */
async function runPlaywrightTest(url, config = {}) {
  return new Promise((resolve, reject) => {
    console.error(`[Playwright] Starting test for URL: ${url}`);
    console.error(`[Playwright] Config:`, config);
    
    // 임시 스크립트 파일 생성 (Playwright API 직접 사용)
    const scriptContent = generatePlaywrightAPIScript(url, config);
    const scriptPath = path.join(__dirname, `temp_script_${Date.now()}.js`);
    
    try {
      fs.writeFileSync(scriptPath, scriptContent);
      console.error(`[Playwright] Script written to: ${scriptPath}`);
    } catch (error) {
      reject(new Error(`Failed to write script file: ${error.message}`));
      return;
    }
    
    // Node.js로 직접 스크립트 실행 (npx 사용)
    const isWindows = process.platform === 'win32';
    let command;
    let commandArgs;
    
    if (isWindows) {
      command = 'cmd';
      commandArgs = ['/c', 'npx', 'playwright', 'install', 'chromium', '&&', 'node', scriptPath];
    } else {
      command = 'bash';
      commandArgs = ['-c', 'npx playwright install chromium && node ' + scriptPath];
    }
    
    console.error(`[Playwright] Executing: ${command} ${commandArgs.join(' ')}`);
    
    const playwrightProcess = spawn(command, commandArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows,
      env: {
        ...process.env,
        CI: 'true',
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0'
      }
    });
    
    let output = '';
    let errorOutput = '';
    
    playwrightProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      console.error(`[Playwright] stdout: ${dataStr.trim()}`);
    });
    
    playwrightProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      console.error(`[Playwright] stderr: ${dataStr.trim()}`);
    });
    
    playwrightProcess.on('close', (code) => {
      console.error(`[Playwright] Process exited with code: ${code}`);
      console.error(`[Playwright] Total stdout length: ${output.length}`);
      console.error(`[Playwright] Total stderr length: ${errorOutput.length}`);
      
      // 임시 파일 정리
      try {
        fs.unlinkSync(scriptPath);
      } catch (error) {
        console.error(`[Playwright] Failed to cleanup script file: ${error.message}`);
      }
      
      if (code === 0) {
        try {
          // JSON 결과 파싱
          const lines = output.trim().split('\n');
          const jsonLine = lines.find(line => line.startsWith('{') && line.endsWith('}'));
          if (jsonLine) {
            const result = JSON.parse(jsonLine);
            console.error(`[Playwright] Test completed successfully`);
            resolve(result);
          } else {
            reject(new Error('No JSON result found in output'));
          }
        } catch (error) {
          console.error(`[Playwright] Failed to parse JSON output: ${error.message}`);
          console.error(`[Playwright] Raw output: ${output}`);
          reject(new Error(`Failed to parse Playwright output: ${error.message}`));
        }
      } else {
        console.error(`[Playwright] Process failed with code: ${code}`);
        console.error(`[Playwright] Error output: ${errorOutput}`);
        console.error(`[Playwright] Stdout output: ${output}`);
        reject(new Error(`Playwright process failed with code: ${code}. Error: ${errorOutput}`));
      }
    });
    
    playwrightProcess.on('error', (error) => {
      console.error(`[Playwright] Failed to start Playwright process: ${error.message}`);
      reject(new Error(`Failed to start Playwright: ${error.message}`));
    });
  });
}

/**
 * Playwright API 스크립트 생성
 */
function generatePlaywrightAPIScript(url, config) {
  const browser = config.browser || 'chromium';
  const headless = config.headless !== false;
  const timeout = config.timeout || 30000;
  
  return `
const { chromium, firefox, webkit } = require('playwright');

(async () => {
  console.log('Starting E2E test for: ${url}');
  
  let browser;
  try {
    // 브라우저 선택
    const browserType = '${browser}';
    console.log('Launching browser:', browserType);
    
    switch (browserType) {
      case 'firefox':
        browser = await firefox.launch({ headless: ${headless} });
        break;
      case 'webkit':
        browser = await webkit.launch({ headless: ${headless} });
        break;
      default:
        browser = await chromium.launch({ headless: ${headless} });
    }
    
    console.log('Browser launched successfully');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 페이지 로드
    console.log('Navigating to: ${url}');
    await page.goto('${url}', { waitUntil: 'networkidle', timeout: ${timeout} });
    
    // 기본 검증
    const title = await page.title();
    console.log('Page title:', title);
    
    // 스크린샷 캡처
    await page.screenshot({ path: 'screenshot.png', fullPage: true });
    console.log('Screenshot captured');
    
    // 성능 메트릭 수집
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    console.log('Performance metrics:', JSON.stringify(performanceMetrics));
    
    // 테스트 결과
    const result = {
      success: true,
      url: '${url}',
      browser: '${browser}',
      performanceMetrics,
      timestamp: new Date().toISOString(),
      logs: [
        'Starting E2E test for: ${url}',
        'Launching browser: ${browser}',
        'Browser launched successfully',
        'Navigating to: ${url}',
        'Page title: ' + title,
        'Screenshot captured',
        'Performance metrics collected',
        'Test completed successfully'
      ],
      screenshot: 'screenshot.png',
      pageTitle: title
    };
    
    console.log('Test completed successfully');
    console.log(JSON.stringify(result));
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Error stack:', error.stack);
    const errorResult = {
      success: false,
      error: error.message,
      url: '${url}',
      timestamp: new Date().toISOString(),
      logs: [
        'Starting E2E test for: ${url}',
        'Test failed: ' + error.message
      ],
      errorStack: error.stack
    };
    console.log(JSON.stringify(errorResult));
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
})();
`;
}

/**
 * 메인 처리 로직
 */
async function main() {
  try {
    // stdin에서 JSON 요청 읽기
    const input = await new Promise((resolve) => {
      rl.once('line', (line) => {
        resolve(line);
      });
    });
    
    console.error(`[MCP] Received request: ${input}`);
    
    let request;
    try {
      request = JSON.parse(input);
    } catch (error) {
      const errorResponse = {
        error: `Invalid JSON request: ${error.message}`
      };
      console.log(JSON.stringify(errorResponse));
      process.exit(1);
    }
    
    // 요청 처리
    if (request.method === 'execute_scenario') {
      const { scenarioCode, config = {} } = request.params || {};
      
      if (!scenarioCode) {
        const errorResponse = {
          error: 'scenarioCode is required'
        };
        console.log(JSON.stringify(errorResponse));
        process.exit(1);
      }
      
      try {
        const result = await executePlaywrightScenario(scenarioCode, config);
        
        const response = {
          result: {
            success: true,
            data: result,
            timestamp: new Date().toISOString()
          }
        };
        
        console.log(JSON.stringify(response));
        process.exit(0);
        
      } catch (error) {
        const errorResponse = {
          error: `Playwright scenario execution failed: ${error.message}`
        };
        console.log(JSON.stringify(errorResponse));
        process.exit(1);
      }
      
    } else if (request.method === 'run_test') {
      const { url, config = {} } = request.params || {};
      
      if (!url) {
        const errorResponse = {
          error: 'URL is required'
        };
        console.log(JSON.stringify(errorResponse));
        process.exit(1);
      }
      
      try {
        const result = await runPlaywrightTest(url, config);
        
        const response = {
          result: {
            success: true,
            data: result,
            timestamp: new Date().toISOString()
          }
        };
        
        console.log(JSON.stringify(response));
        process.exit(0);
        
      } catch (error) {
        const errorResponse = {
          error: `Playwright test failed: ${error.message}`
        };
        console.log(JSON.stringify(errorResponse));
        process.exit(1);
      }
      
    } else {
      const errorResponse = {
        error: `Unknown method: ${request.method}`
      };
      console.log(JSON.stringify(errorResponse));
      process.exit(1);
    }
    
  } catch (error) {
    const errorResponse = {
      error: `Server error: ${error.message}`
    };
    console.log(JSON.stringify(errorResponse));
    process.exit(1);
  }
}

// 서버 시작
main().catch((error) => {
  const errorResponse = {
    error: `Fatal error: ${error.message}`
  };
  console.log(JSON.stringify(errorResponse));
  process.exit(1);
}); 