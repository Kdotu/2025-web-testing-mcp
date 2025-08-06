#!/usr/bin/env node

/**
 * Lighthouse MCP Server
 * JSON 기반 stdin/stdout 통신을 사용하여 Lighthouse 감사 실행
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// stdin/stdout 인터페이스 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

/**
 * Chrome 실행 파일 경로 확인
 */
function findChromePath() {
  const possiblePaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chrome',
    '/usr/bin/chromium-browser-stable',
    '/usr/bin/chromium-browser-unstable',
    '/usr/bin/chromium-browser-dev',
    '/usr/bin/chromium-browser-beta',
    '/usr/bin/chromium-browser-alpha',
    '/usr/bin/chromium-browser-nightly',
    '/usr/bin/chromium-browser-snapshot',
    '/usr/bin/chromium-browser-canary',
    '/usr/bin/chromium-browser-ungoogled',
    '/usr/bin/chromium-browser-ungoogled-stable',
    '/usr/bin/chromium-browser-ungoogled-unstable',
    '/usr/bin/chromium-browser-ungoogled-dev',
    '/usr/bin/chromium-browser-ungoogled-beta',
    '/usr/bin/chromium-browser-ungoogled-alpha',
    '/usr/bin/chromium-browser-ungoogled-nightly',
    '/usr/bin/chromium-browser-ungoogled-snapshot',
    '/usr/bin/chromium-browser-ungoogled-canary',
    process.env.CHROME_PATH,
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH
  ].filter(Boolean);

  console.error(`[Lighthouse] Checking Chrome paths: ${possiblePaths.join(', ')}`);

  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      console.error(`[Lighthouse] Found Chrome at: ${chromePath}`);
      return chromePath;
    }
  }

  // 추가로 which 명령어로 Chrome 찾기 시도
  try {
    const { execSync } = require('child_process');
    const whichResult = execSync('which chromium-browser', { encoding: 'utf8' }).trim();
    if (whichResult && fs.existsSync(whichResult)) {
      console.error(`[Lighthouse] Found Chrome via which: ${whichResult}`);
      return whichResult;
    }
  } catch (error) {
    console.error(`[Lighthouse] which command failed: ${error.message}`);
  }

  console.error(`[Lighthouse] Chrome not found in any of the checked paths`);
  return null;
}

/**
 * Lighthouse 감사 실행
 */
async function runLighthouseAudit(url, device = 'desktop', categories = ['performance', 'accessibility', 'best-practices', 'seo'], throttling = true) {
  return new Promise((resolve, reject) => {
    console.error(`[Lighthouse] Starting audit for URL: ${url}`);
    console.error(`[Lighthouse] Device: ${device}`);
    console.error(`[Lighthouse] Categories: ${categories.join(', ')}`);
    
    // Chrome 경로 확인
    const chromePath = findChromePath();
    if (!chromePath) {
      reject(new Error('Chrome browser not found. Please ensure Chrome is installed and CHROME_PATH is set correctly.'));
      return;
    }
    
    // Lighthouse CLI 명령어 구성
    const args = [
      url,
      '--output=json',
      '--only-categories=' + categories.join(','),
      '--chrome-flags=--headless --no-sandbox --disable-gpu --disable-dev-shm-usage',
      '--port=0'
    ];
    
    if (device === 'mobile') {
      args.push('--preset=perf');
    }
    
    if (throttling) {
      args.push('--throttling.cpuSlowdownMultiplier=4');
    }
    
    // 운영체제에 따른 Lighthouse 실행 경로 설정
    const isWindows = process.platform === 'win32';
    let lighthousePath;
    let command;
    let commandArgs;
    
    if (isWindows) {
      // Windows 환경: cmd를 통해 .cmd 파일 실행
      lighthousePath = path.join(__dirname, '../../node_modules/.bin/lighthouse.cmd');
      command = 'cmd';
      commandArgs = ['/c', lighthousePath, ...args];
      console.error(`[Lighthouse] Windows Command: ${command} ${commandArgs.join(' ')}`);
    } else {
      // Linux/Mac 환경: 직접 lighthouse 실행
      lighthousePath = path.join(__dirname, '../../node_modules/.bin/lighthouse');
      command = lighthousePath;
      commandArgs = args;
      console.error(`[Lighthouse] Linux/Mac Command: ${command} ${commandArgs.join(' ')}`);
    }
    
    // 환경변수 설정
    const env = {
      ...process.env,
      // Chrome 관련 환경변수
      CHROME_PATH: chromePath,
      CHROME_BIN: chromePath,
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true',
      PUPPETEER_EXECUTABLE_PATH: chromePath,
      // Linux 환경에서 필요한 환경변수
      DISPLAY: process.env.DISPLAY || ':0',
      // 추가 Chrome 플래그
      CHROME_FLAGS: '--headless --no-sandbox --disable-gpu --disable-dev-shm-usage'
    };
    
    console.error(`[Lighthouse] Environment variables:`, {
      CHROME_PATH: env.CHROME_PATH,
      CHROME_BIN: env.CHROME_BIN,
      DISPLAY: env.DISPLAY
    });
    
    // Lighthouse 프로세스 시작
    const lighthouseProcess = spawn(command, commandArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env
    });
    
    let output = '';
    let errorOutput = '';
    
    lighthouseProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    lighthouseProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[Lighthouse] stderr: ${data.toString().trim()}`);
    });
    
    lighthouseProcess.on('close', (code) => {
      console.error(`[Lighthouse] Process exited with code: ${code}`);
      
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          console.error(`[Lighthouse] Audit completed successfully`);
          resolve(result);
        } catch (error) {
          console.error(`[Lighthouse] Failed to parse JSON output: ${error.message}`);
          reject(new Error(`Failed to parse Lighthouse output: ${error.message}`));
        }
      } else {
        console.error(`[Lighthouse] Process failed with code: ${code}`);
        console.error(`[Lighthouse] Error output: ${errorOutput}`);
        reject(new Error(`Lighthouse process failed with code: ${code}`));
      }
    });
    
    lighthouseProcess.on('error', (error) => {
      console.error(`[Lighthouse] Failed to start Lighthouse process: ${error.message}`);
      reject(new Error(`Failed to start Lighthouse: ${error.message}`));
    });
  });
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
    if (request.method === 'run_audit') {
      const { url, device = 'desktop', categories = ['performance', 'accessibility', 'best-practices', 'seo'], throttling = true } = request.params || {};
      
      if (!url) {
        const errorResponse = {
          error: 'URL is required'
        };
        console.log(JSON.stringify(errorResponse));
        process.exit(1);
      }
      
      try {
        const result = await runLighthouseAudit(url, device, categories, throttling);
        
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
          error: `Lighthouse audit failed: ${error.message}`
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