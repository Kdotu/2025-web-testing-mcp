#!/usr/bin/env node

/**
 * Enhanced Playwright MCP Server 테스트 스크립트
 * MCP 서버가 정상적으로 동작하는지 테스트
 */

const { spawn } = require('child_process');
const path = require('path');

// MCP 서버 경로
const mcpServerPath = path.join(__dirname, 'enhanced_mcp_server.js');

console.log('🧪 Enhanced Playwright MCP Server 테스트 시작');
console.log('MCP 서버 경로:', mcpServerPath);

// MCP 서버 프로세스 실행
const mcpProcess = spawn('node', [mcpServerPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

let testResults = [];

// stdout에서 응답 수신
mcpProcess.stdout.on('data', (data) => {
  const dataStr = data.toString().trim();
  if (dataStr) {
    console.log('📤 MCP 서버 응답:', dataStr);
    testResults.push(dataStr);
  }
});

// stderr에서 로그 수신
mcpProcess.stderr.on('data', (data) => {
  const dataStr = data.toString().trim();
  if (dataStr) {
    console.log('📝 MCP 서버 로그:', dataStr);
  }
});

// 프로세스 종료 처리
mcpProcess.on('close', (code) => {
  console.log(`\n🏁 MCP 서버 프로세스 종료 (코드: ${code})`);
  console.log('📊 테스트 결과:', testResults.length, '개 응답 수신');
  
  if (code === 0) {
    console.log('✅ 테스트 성공');
  } else {
    console.log('❌ 테스트 실패');
  }
  
  process.exit(code);
});

// 테스트 1: 도구 목록 조회
console.log('\n🔍 테스트 1: 도구 목록 조회');
const toolsListRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

mcpProcess.stdin.write(JSON.stringify(toolsListRequest) + '\n');

// 2초 후 다음 테스트
setTimeout(() => {
  // 테스트 2: 자연어 변환
  console.log('\n🔍 테스트 2: 자연어 변환');
  const convertRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'convert_natural_language',
      arguments: {
        naturalLanguage: `1) https://example.com에 접속한다
2) "로그인" 버튼을 클릭한다
3) "이메일" 필드에 "user@example.com"을 입력한다
4) "비밀번호" 필드에 "password123"을 입력한다
5) "제출" 버튼을 클릭한다
6) "환영합니다" 텍스트가 보이는지 확인한다`,
        config: {
          browser: 'chromium',
          headless: true,
          viewport: { width: 1280, height: 720 }
        }
      }
    }
  };
  
  mcpProcess.stdin.write(JSON.stringify(convertRequest) + '\n');
}, 2000);

// 4초 후 프로세스 종료
setTimeout(() => {
  console.log('\n🔄 테스트 완료, 프로세스 종료');
  mcpProcess.stdin.end();
}, 4000);
