#!/usr/bin/env node

/**
 * Playwright MCP Server
 * JSON 기반 stdin/stdout 통신을 사용하여 Playwright 테스트 실행
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
 * Playwright 테스트 실행
 */
async function runPlaywrightTest(url, config = {}) {
  return new Promise((resolve, reject) => {
    console.error(`[Playwright] Starting test for URL: ${url}`);
    console.error(`[Playwright] Config:`, config);
    
    // 임시 스크립트 파일 생성
    const scriptContent = generatePlaywrightScript(url, config);
    const scriptPath = path.join(__dirname, `temp_script_${Date.now()}.js`);
    
    try {
      fs.writeFileSync(scriptPath, scriptContent);
      console.error(`[Playwright] Script written to: ${scriptPath}`);
    } catch (error) {
      reject(new Error(`Failed to write script file: ${error.message}`));
      return;
    }
    
    // Playwright 프로세스 시작
    const playwrightProcess = spawn('npx', ['playwright', 'test', scriptPath, '--reporter=json'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CI: 'true'
      }
    });
    
    let output = '';
    let errorOutput = '';
    
    playwrightProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    playwrightProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[Playwright] stderr: ${data.toString().trim()}`);
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
          const result = JSON.parse(output);
          console.error(`[Playwright] Test completed successfully`);
          resolve(result);
        } catch (error) {
          console.error(`[Playwright] Failed to parse JSON output: ${error.message}`);
          reject(new Error(`Failed to parse Playwright output: ${error.message}`));
        }
      } else {
        console.error(`[Playwright] Process failed with code: ${code}`);
        console.error(`[Playwright] Error output: ${errorOutput}`);
        reject(new Error(`Playwright process failed with code: ${code}`));
      }
    });
    
    playwrightProcess.on('error', (error) => {
      console.error(`[Playwright] Failed to start Playwright process: ${error.message}`);
      reject(new Error(`Failed to start Playwright: ${error.message}`));
    });
  });
}

/**
 * Playwright 스크립트 생성
 */
function generatePlaywrightScript(url, config) {
  const browser = config.browser || 'chromium';
  const headless = config.headless !== false;
  const timeout = config.timeout || 30000;
  
  return `
const { test, expect } = require('@playwright/test');

test('E2E Test for ${url}', async ({ page }) => {
  console.log('Starting E2E test for: ${url}');
  
  // 페이지 로드
  await page.goto('${url}', { waitUntil: 'networkidle', timeout: ${timeout} });
  
  // 기본 검증
  await expect(page).toHaveTitle(/./);
  
  // 스크린샷 캡처
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  
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
  
  // 테스트 결과 반환
  test.info().annotations.push({
    type: 'test-result',
    description: 'E2E Test Results',
    data: {
      url: '${url}',
      browser: '${browser}',
      performanceMetrics,
      timestamp: new Date().toISOString()
    }
  });
});
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
    if (request.method === 'run_test') {
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