"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mcp_client_factory_1 = require("../services/mcp-client-factory");
const router = (0, express_1.Router)();
router.get('/mcp-status', async (_req, res) => {
    try {
        console.log('[MCP Status] Checking external MCP servers...');
        const serverStatus = await mcp_client_factory_1.MCPClientFactory.checkExternalServers();
        console.log('[MCP Status] Server status:', serverStatus);
        res.json({
            success: true,
            data: {
                externalServers: serverStatus,
                timestamp: new Date().toISOString(),
                message: 'External MCP servers status checked successfully'
            }
        });
    }
    catch (error) {
        console.error('[MCP Status] Error checking external servers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check external MCP servers',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/mcp-status/test', async (req, res) => {
    try {
        const { serverType } = req.body;
        if (!serverType || !['k6', 'lighthouse', 'playwright'].includes(serverType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid server type. Must be one of: k6, lighthouse, playwright'
            });
        }
        console.log(`[MCP Status] Testing ${serverType} server...`);
        let client;
        let testResult;
        switch (serverType) {
            case 'k6':
                client = mcp_client_factory_1.MCPClientFactory.createExternalK6Client();
                testResult = await client.callTool('execute_k6_test', {
                    script_file: 'test.js',
                    duration: '5s',
                    vus: 1
                });
                break;
            case 'lighthouse':
                client = mcp_client_factory_1.MCPClientFactory.createExternalLighthouseClient();
                testResult = await client.callTool('run_audit', {
                    url: 'https://example.com',
                    device: 'desktop',
                    categories: ['performance']
                });
                break;
            case 'playwright':
                client = mcp_client_factory_1.MCPClientFactory.createExternalPlaywrightClient();
                testResult = await client.callTool('run_test', {
                    url: 'https://example.com',
                    config: { headless: true }
                });
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Unknown server type'
                });
        }
        await client.close();
        return res.json({
            success: true,
            data: {
                serverType,
                testResult,
                timestamp: new Date().toISOString(),
                message: `${serverType} server test completed successfully`
            }
        });
    }
    catch (error) {
        console.error(`[MCP Status] Error testing server:`, error);
        return res.status(500).json({
            success: false,
            error: 'Failed to test MCP server',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/mcp-status/config', (_req, res) => {
    try {
        const config = {
            externalServers: {
                k6: {
                    command: 'python',
                    args: ['k6_server.py'],
                    cwd: 'mcp/k6-mcp-server',
                    env: ['K6_BIN']
                },
                lighthouse: {
                    command: 'node',
                    args: ['lighthouse_server.js'],
                    cwd: 'mcp/lighthouse-mcp-server',
                    env: ['LIGHTHOUSE_BIN']
                },
                playwright: {
                    command: 'node',
                    args: ['playwright_server.js'],
                    cwd: 'mcp/playwright-mcp-server',
                    env: ['PLAYWRIGHT_BIN']
                }
            },
            localServers: {
                k6: 'mcp/k6-mcp-server/k6_server.py',
                lighthouse: 'mcp/lighthouse-mcp-server/lighthouse_server.js',
                playwright: 'mcp/playwright-mcp-server/playwright_server.js'
            }
        };
        res.json({
            success: true,
            data: config
        });
    }
    catch (error) {
        console.error('[MCP Status] Error getting config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get MCP server configuration'
        });
    }
});
exports.default = router;
//# sourceMappingURL=mcp-status.js.map