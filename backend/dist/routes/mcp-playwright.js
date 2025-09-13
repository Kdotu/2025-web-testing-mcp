"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
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
        const mcpServerPath = path_1.default.join(__dirname, '../../mcp/playwright-mcp-server/enhanced_mcp_server.js');
        try {
            const fs = require('fs');
            const resolved = require('path').resolve(mcpServerPath);
            if (!fs.existsSync(resolved)) {
                console.error('[MCP API] Enhanced MCP server script not found at:', resolved);
                res.status(500).json({ success: false, error: 'MCP converter script not found' });
                return;
            }
            console.log('[MCP API] Using converter script:', resolved);
        }
        catch (e) {
            console.error('[MCP API] Failed to verify converter script path:', e.message);
        }
        const mcpProcess = (0, child_process_1.spawn)('node', [mcpServerPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_ENV: 'production'
            }
        });
        const mcpRequest = {
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
        mcpProcess.stdout.on('data', (data) => {
            const dataStr = data.toString().trim();
            if (dataStr) {
                result += dataStr + '\n';
                console.log('[MCP API] MCP 서버 응답:', dataStr);
            }
        });
        mcpProcess.stderr.on('data', (data) => {
            const dataStr = data.toString().trim();
            if (dataStr) {
                errorOutput += dataStr + '\n';
                console.log('[MCP API] MCP 서버 로그:', dataStr);
            }
        });
        mcpProcess.on('close', (code) => {
            if (isCompleted)
                return;
            isCompleted = true;
            console.log(`[MCP API] MCP 서버 프로세스 종료 (코드: ${code})`);
            if (code === 0 && result.trim()) {
                try {
                    const lines = result.trim().split('\n');
                    const jsonLine = lines.find(line => line.startsWith('{') && line.endsWith('}'));
                    if (jsonLine) {
                        const mcpResponse = JSON.parse(jsonLine);
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
                }
                catch (parseError) {
                    console.error('[MCP API] JSON 파싱 오류:', parseError);
                }
            }
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
        mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
        mcpProcess.stdin.end();
        mcpProcess.on('close', () => {
            clearTimeout(timeout);
        });
    }
    catch (error) {
        console.error('[MCP API] 오류 발생:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
        });
    }
});
router.get('/status', (_req, res) => {
    try {
        const mcpServerPath = path_1.default.join(__dirname, '../../mcp/playwright-mcp-server/enhanced_mcp_server.js');
        const fs = require('fs');
        if (!fs.existsSync(mcpServerPath)) {
            res.json({
                success: false,
                status: 'not_found',
                error: 'MCP 서버 파일을 찾을 수 없습니다'
            });
            return;
        }
        const mcpProcess = (0, child_process_1.spawn)('node', [mcpServerPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env }
        });
        let isResponding = false;
        let testResult = '';
        const testRequest = {
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
                }
                catch (error) {
                    console.error('[MCP API] 테스트 응답 파싱 오류:', error);
                }
            }
            res.json({
                success: false,
                status: 'not_responding',
                error: 'MCP 서버가 응답하지 않습니다'
            });
        });
        mcpProcess.stdin.write(JSON.stringify(testRequest) + '\n');
        mcpProcess.stdin.end();
    }
    catch (error) {
        console.error('[MCP API] 상태 확인 오류:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            error: error instanceof Error ? error.message : '상태 확인 중 오류가 발생했습니다'
        });
    }
});
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
exports.default = router;
//# sourceMappingURL=mcp-playwright.js.map