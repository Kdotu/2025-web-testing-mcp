import express from 'express';
import { spawn } from 'child_process';
import path from 'path';

const router = express.Router();

/**
 * MCP 서버와의 통신을 위한 인터페이스
 */
interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * 자연어를 Playwright 코드로 변환하는 API
 * POST /api/mcp/playwright/convert
 */
router.post('/convert', (req, res) => {
  try {
    const { naturalLanguage, config = {} } = req.body;
    
    if (!naturalLanguage) {
      res.status(400).json({
        success: false,
        error: 'naturalLanguage parameter is required'
      });
      return;
    }

    console.log('[MCP API] 자연어 변환 요청:', { naturalLanguage, config });

    // MCP 서버 프로세스 실행
    const mcpServerPath = path.join(__dirname, '../../mcp/playwright-mcp-server/enhanced_mcp_server.js');
    const mcpProcess = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    // MCP 요청 생성
    const mcpRequest: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'convert_natural_language',
        arguments: { naturalLanguage, config }
      }
    };

    let result = '';
    let errorOutput = '';
    let isCompleted = false;

    // stdout에서 응답 수신
    mcpProcess.stdout.on('data', (data) => {
      const dataStr = data.toString().trim();
      if (dataStr) {
        result += dataStr + '\n';
        console.log('[MCP API] MCP 서버 응답:', dataStr);
      }
    });

    // stderr에서 에러 수신
    mcpProcess.stderr.on('data', (data) => {
      const dataStr = data.toString().trim();
      if (dataStr) {
        errorOutput += dataStr + '\n';
        console.log('[MCP API] MCP 서버 로그:', dataStr);
      }
    });

    // 프로세스 종료 처리
    mcpProcess.on('close', (code) => {
      if (isCompleted) return;
      isCompleted = true;

      console.log(`[MCP API] MCP 서버 프로세스 종료 (코드: ${code})`);

      if (code === 0 && result.trim()) {
        try {
          // JSON 응답 파싱
          const lines = result.trim().split('\n');
          const jsonLine = lines.find(line => line.startsWith('{') && line.endsWith('}'));
          
          if (jsonLine) {
            const mcpResponse: MCPResponse = JSON.parse(jsonLine);
            
            if (mcpResponse.error) {
              res.status(500).json({
                success: false,
                error: `MCP 서버 오류: ${mcpResponse.error.message}`,
                code: mcpResponse.error.code
              });
              return;
            }

            if (mcpResponse.result?.content?.[0]?.text) {
              const generatedCode = mcpResponse.result.content[0].text;
              const metadata = mcpResponse.result.metadata;

              res.json({
                success: true,
                code: generatedCode,
                metadata: {
                  stepsCount: metadata?.stepsCount || 0,
                  patterns: metadata?.patterns || [],
                  config: metadata?.config || {}
                }
              });
              return;
            }
          }
        } catch (parseError) {
          console.error('[MCP API] JSON 파싱 오류:', parseError);
        }
      }

      // 오류 응답
      res.status(500).json({
        success: false,
        error: 'MCP 서버에서 응답을 받지 못했습니다',
        details: {
          exitCode: code,
          stdout: result.trim(),
          stderr: errorOutput.trim()
        }
      });
    });

    // 타임아웃 설정 (30초)
    const timeout = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true;
        mcpProcess.kill();
        res.status(408).json({
          success: false,
          error: 'MCP 서버 응답 시간 초과'
        });
      }
    }, 30000);

    // MCP 요청 전송
    mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
    mcpProcess.stdin.end();

    // 응답 완료 시 타임아웃 해제
    mcpProcess.on('close', () => {
      clearTimeout(timeout);
    });

  } catch (error) {
    console.error('[MCP API] 오류 발생:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
    });
  }
});

/**
 * MCP 서버 상태 확인 API
 * GET /api/mcp/playwright/status
 */
router.get('/status', (_req, res) => {
  try {
    const mcpServerPath = path.join(__dirname, '../../mcp/playwright-mcp-server/enhanced_mcp_server.js');
    
    // 파일 존재 여부 확인
    const fs = require('fs');
    if (!fs.existsSync(mcpServerPath)) {
      res.json({
        success: false,
        status: 'not_found',
        error: 'MCP 서버 파일을 찾을 수 없습니다'
      });
      return;
    }

    // MCP 서버 프로세스 테스트
    const mcpProcess = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let isResponding = false;
    let testResult = '';

    // 테스트 요청 전송
    const testRequest: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    mcpProcess.stdout.on('data', (data) => {
      const dataStr = data.toString().trim();
      if (dataStr) {
        testResult = dataStr;
        isResponding = true;
      }
    });

    // 5초 후 프로세스 종료
    setTimeout(() => {
      mcpProcess.kill();
    }, 5000);

    mcpProcess.on('close', () => {
      if (isResponding) {
        try {
          const response = JSON.parse(testResult);
          if (response.result?.tools) {
            res.json({
              success: true,
              status: 'running',
              tools: response.result.tools,
              message: 'MCP 서버가 정상적으로 동작하고 있습니다'
            });
            return;
          }
        } catch (error) {
          console.error('[MCP API] 테스트 응답 파싱 오류:', error);
        }
      }

      res.json({
        success: false,
        status: 'not_responding',
        error: 'MCP 서버가 응답하지 않습니다'
      });
    });

    // 테스트 요청 전송
    mcpProcess.stdin.write(JSON.stringify(testRequest) + '\n');
    mcpProcess.stdin.end();

  } catch (error) {
    console.error('[MCP API] 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : '상태 확인 중 오류가 발생했습니다'
    });
  }
});

/**
 * 지원하는 자연어 패턴 정보 API
 * GET /api/mcp/playwright/patterns
 */
router.get('/patterns', (_req, res) => {
  const patterns = [
    {
      name: 'navigation',
      description: '페이지 이동 및 접속',
      examples: [
        'https://example.com에 접속한다',
        '홈페이지로 이동한다',
        '로그인 페이지에 방문한다'
      ],
      regex: '(?:접속|방문|이동).*https?://[^\\s]+'
    },
    {
      name: 'click',
      description: '요소 클릭',
      examples: [
        '"로그인" 버튼을 클릭한다',
        '메뉴를 누른다',
        '제출 버튼을 클릭한다'
      ],
      regex: '(?:클릭|누른다?|클릭한다?).*["""\']([^""\']+)["""\']'
    },
    {
      name: 'input',
      description: '폼 입력',
      examples: [
        '"이메일" 필드에 "user@example.com"을 입력한다',
        '비밀번호에 "password123"을 입력한다'
      ],
      regex: '(?:입력|채운다?|타이핑).*["""\']([^""\']+)["""\']\\s*(?:에|을|를)\\s*["""\']([^""\']+)["""\']'
    },
    {
      name: 'verification',
      description: '요소 검증',
      examples: [
        '"환영합니다" 텍스트가 보이는지 확인한다',
        '로그인 폼이 존재하는지 검증한다'
      ],
      regex: '(?:확인|검증|보인다?|존재한다?).*["""\']([^""\']+)["""\']'
    },
    {
      name: 'wait',
      description: '대기 및 로딩',
      examples: [
        '페이지 로딩이 완료될 때까지 기다린다',
        'API 응답을 기다린다'
      ],
      regex: '(?:기다린다?|대기|로딩|완료).*?(?:까지|될\\s*때|완료)'
    },
    {
      name: 'screenshot',
      description: '스크린샷 촬영',
      examples: [
        '현재 페이지의 스크린샷을 찍는다',
        '스크린샷을 캡처한다'
      ],
      regex: '(?:스크린샷|캡처|스크린샷을\\s*찍는다?)'
    }
  ];

  res.json({
    success: true,
    patterns,
    total: patterns.length,
    message: '지원하는 자연어 패턴 정보입니다'
  });
});

export default router;
