#!/usr/bin/env node

/**
 * Lighthouse MCP Server
 * JSON 기반 stdin/stdout 통신을 사용하여 Lighthouse 감사 실행
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

// stdin/stdout 인터페이스 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

/**
 * Lighthouse 감사 실행
 */
async function runLighthouseAudit(url, device = 'desktop', categories = ['performance', 'accessibility', 'best-practices', 'seo'], throttling = true) {
  return new Promise((resolve, reject) => {
    console.error(`[Lighthouse] Starting audit for URL: ${url}`);
    console.error(`[Lighthouse] Device: ${device}`);
    console.error(`[Lighthouse] Categories: ${categories.join(', ')}`);
    
    // Lighthouse CLI 명령어 구성
    const args = [
      url,
      '--output=json',
      '--only-categories=' + categories.join(','),
      '--chrome-flags=--headless --no-sandbox --disable-gpu',
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
    let command;
    let commandArgs;
    
    if (isWindows) {
      // Windows 환경: npx를 통해 lighthouse 실행
      try {
        // npx lighthouse 명령어 사용
        command = 'npx.cmd';
        commandArgs = ['lighthouse', ...args];
        console.error(`[Lighthouse] Windows Command: ${command} ${commandArgs.join(' ')}`);
      } catch (error) {
        console.error(`[Lighthouse] Failed to setup Windows command: ${error.message}`);
        reject(new Error(`Failed to setup Windows command: ${error.message}`));
        return;
      }
    } else {
      // Linux/Mac 환경: 직접 lighthouse 실행
      const lighthousePath = path.join(__dirname, '../../node_modules/.bin/lighthouse');
      command = lighthousePath;
      commandArgs = args;
      console.error(`[Lighthouse] Linux/Mac Command: ${command} ${commandArgs.join(' ')}`);
    }
    
    // Lighthouse 프로세스 시작
    const lighthouseProcess = spawn(command, commandArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows, // Windows에서는 shell 옵션 사용
      env: {
        ...process.env,
        // Linux 환경에서 필요한 환경변수 설정
        DISPLAY: process.env.DISPLAY || ':0',
        // Chrome 관련 환경변수
        CHROME_PATH: process.env.CHROME_PATH,
        CHROME_BIN: process.env.CHROME_BIN
      }
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