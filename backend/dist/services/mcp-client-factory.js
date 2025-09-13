"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPClientFactory = void 0;
const path_1 = require("path");
const mcp_process_manager_1 = require("../services/mcp-process-manager");
class MCPClientFactory {
    static getProcessManager() {
        if (!this.processManager) {
            this.processManager = new mcp_process_manager_1.MCPProcessManager();
        }
        return this.processManager;
    }
    static createExternalK6Client() {
        const config = {
            command: process.platform === 'win32' ? 'python' : 'python3',
            args: ['k6_server.py'],
            cwd: (0, path_1.join)(process.cwd(), 'mcp', 'k6-mcp-server'),
            env: {
                ...process.env,
                ['K6_BIN']: process.env['K6_BIN'] || 'k6',
                ['PYTHON_PATH']: process.env['PYTHON_PATH'] || (process.platform === 'win32' ? 'python' : 'python3')
            }
        };
        return new ExternalMCPClient('external-k6', config, this.getProcessManager());
    }
    static createLocalK6Client() {
        return new SimpleMCPClient('local-k6', (0, path_1.join)(process.cwd(), 'mcp', 'k6-mcp-server', 'k6_server.py'));
    }
    static createK6Client() {
        try {
            return this.createExternalK6Client();
        }
        catch (error) {
            console.log('[MCP Client] External k6 server not available, using local server');
            return this.createLocalK6Client();
        }
    }
    static createExternalLighthouseClient() {
        const config = {
            command: 'node',
            args: ['lighthouse_server.js'],
            cwd: (0, path_1.join)(process.cwd(), 'mcp', 'lighthouse-mcp-server'),
            env: {
                ...process.env,
                ['LIGHTHOUSE_BIN']: process.env['LIGHTHOUSE_BIN'] || 'npx lighthouse'
            }
        };
        return new ExternalMCPClient('external-lighthouse', config, this.getProcessManager());
    }
    static createLocalLighthouseClient() {
        return new SimpleMCPClient('local-lighthouse', (0, path_1.join)(process.cwd(), 'mcp', 'lighthouse-mcp-server', 'lighthouse_server.js'));
    }
    static createLighthouseClient() {
        try {
            return this.createExternalLighthouseClient();
        }
        catch (error) {
            console.log('[MCP Client] External lighthouse server not available, using local server');
            return this.createLocalLighthouseClient();
        }
    }
    static createExternalPlaywrightClient() {
        const config = {
            command: 'node',
            args: ['playwright_server.js'],
            cwd: (0, path_1.join)(process.cwd(), 'mcp', 'playwright-mcp-server'),
            env: {
                ...process.env,
                ['PLAYWRIGHT_BIN']: process.env['PLAYWRIGHT_BIN'] || 'npx playwright'
            }
        };
        return new ExternalMCPClient('external-playwright', config, this.getProcessManager());
    }
    static createLocalPlaywrightClient() {
        return new SimpleMCPClient('local-playwright', (0, path_1.join)(process.cwd(), 'mcp', 'playwright-mcp-server', 'playwright_server.js'));
    }
    static createPlaywrightClient() {
        try {
            return this.createExternalPlaywrightClient();
        }
        catch (error) {
            console.log('[MCP Client] External playwright server not available, using local server');
            return this.createLocalPlaywrightClient();
        }
    }
    static createAllClients() {
        return {
            k6: this.createK6Client(),
            lighthouse: this.createLighthouseClient(),
            playwright: this.createPlaywrightClient()
        };
    }
    static async checkExternalServers() {
        const results = {
            k6: false,
            lighthouse: false,
            playwright: false
        };
        try {
            const k6Client = this.createExternalK6Client();
            await k6Client.initialize();
            await k6Client.close();
            results.k6 = true;
        }
        catch (error) {
            console.log('[MCP Client] External k6 server not available');
        }
        try {
            const lighthouseClient = this.createExternalLighthouseClient();
            await lighthouseClient.initialize();
            await lighthouseClient.close();
            results.lighthouse = true;
        }
        catch (error) {
            console.log('[MCP Client] External lighthouse server not available');
        }
        try {
            const playwrightClient = this.createExternalPlaywrightClient();
            await playwrightClient.initialize();
            await playwrightClient.close();
            results.playwright = true;
        }
        catch (error) {
            console.log('[MCP Client] External playwright server not available');
        }
        return results;
    }
}
exports.MCPClientFactory = MCPClientFactory;
MCPClientFactory.processManager = null;
class ExternalMCPClient {
    constructor(serverName, config, processManager) {
        this.processId = null;
        this.serverName = serverName;
        this.config = config;
        this.processManager = processManager;
    }
    async initialize() {
        console.log(`[External MCP Client] Initializing ${this.serverName} client`);
        try {
            this.processId = await this.processManager.startServer({
                name: this.serverName,
                command: this.config.command,
                args: this.config.args,
                cwd: this.config.cwd || process.cwd(),
                env: this.config.env || process.env
            });
            console.log(`[External MCP Client] ${this.serverName} client initialized with process ID: ${this.processId}`);
        }
        catch (error) {
            console.error(`[External MCP Client] Failed to initialize ${this.serverName} client:`, error);
            throw error;
        }
    }
    async callTool(method, params) {
        try {
            if (!this.processId) {
                await this.initialize();
            }
            const result = await this.processManager.executeCommand(this.processId, method, params);
            return result;
        }
        catch (error) {
            console.error(`[External MCP Client] Error calling ${method} on ${this.serverName}:`, error);
            throw error;
        }
    }
    async close() {
        console.log(`[External MCP Client] Closing ${this.serverName} client`);
        if (this.processId) {
            try {
                await this.processManager.stopServer(this.processId);
                this.processId = null;
                console.log(`[External MCP Client] ${this.serverName} client closed successfully`);
            }
            catch (error) {
                console.error(`[External MCP Client] Error closing ${this.serverName} client:`, error);
            }
        }
    }
}
class SimpleMCPClient {
    constructor(serverName, serverPath) {
        this.processId = null;
        this.serverName = serverName;
        this.serverPath = serverPath;
        this.processManager = MCPClientFactory.getProcessManager();
    }
    async initialize() {
        console.log(`[Local MCP Client] Initializing ${this.serverName} client`);
        try {
            const isPythonFile = this.serverPath.endsWith('.py');
            const isTypeScriptFile = this.serverPath.endsWith('.ts');
            let command;
            let args;
            if (isPythonFile) {
                const pythonPath = process.env['PYTHON_PATH'] || 'python3';
                command = pythonPath;
                args = [this.serverPath];
            }
            else if (isTypeScriptFile) {
                const isWindows = global.process.platform === 'win32';
                if (isWindows) {
                    command = 'cmd';
                    args = ['/c', 'npx', 'ts-node', this.serverPath];
                }
                else {
                    command = 'npx';
                    args = ['ts-node', this.serverPath];
                }
            }
            else {
                command = 'node';
                args = [this.serverPath];
            }
            this.processId = await this.processManager.startServer({
                name: this.serverName,
                command,
                args,
                cwd: process.cwd(),
                env: process.env
            });
            console.log(`[Local MCP Client] ${this.serverName} client initialized with process ID: ${this.processId}`);
        }
        catch (error) {
            console.error(`[Local MCP Client] Failed to initialize ${this.serverName} client:`, error);
            throw error;
        }
    }
    async callTool(method, params) {
        if (!this.processId) {
            throw new Error('Client not initialized');
        }
        try {
            return await this.processManager.executeCommand(this.processId, method, params);
        }
        catch (error) {
            console.error(`[Local MCP Client] Error calling ${method} on ${this.serverName}:`, error);
            throw error;
        }
    }
    async close() {
        console.log(`[Local MCP Client] Closing ${this.serverName} client`);
        if (this.processId) {
            try {
                await this.processManager.stopServer(this.processId);
                this.processId = null;
                console.log(`[Local MCP Client] ${this.serverName} client closed successfully`);
            }
            catch (error) {
                console.error(`[Local MCP Client] Error closing ${this.serverName} client:`, error);
            }
        }
    }
}
//# sourceMappingURL=mcp-client-factory.js.map