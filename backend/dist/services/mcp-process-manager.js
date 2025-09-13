"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPProcessManager = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
class MCPProcessManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.processes = new Map();
        this.healthCheckTimers = new Map();
        this.DEFAULT_HEALTH_CHECK_INTERVAL = 30000;
        this.DEFAULT_MAX_RESTARTS = 3;
        this.DEFAULT_TIMEOUT = 60000;
        this.setupProcessCleanup();
    }
    async startServer(config) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const processId = `${config.name}-${timestamp}-${random}`;
        try {
            if (this.isServerRunning(config.name)) {
                console.log(`[MCP Process Manager] Server ${config.name} is already running`);
                const existingId = this.getRunningServerId(config.name);
                if (existingId) {
                    return existingId;
                }
            }
            console.log(`[MCP Process Manager] Starting ${config.name} server...`);
            const childProcess = (0, child_process_1.spawn)(config.command, config.args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: config.cwd,
                env: {
                    ...process.env,
                    ...config.env,
                    MCP_SERVER_ID: processId
                }
            });
            const processInfo = {
                id: processId,
                name: config.name,
                process: childProcess,
                startTime: new Date(),
                lastActivity: new Date(),
                isHealthy: true,
                restartCount: 0,
                maxRestarts: config.maxRestarts || this.DEFAULT_MAX_RESTARTS,
                command: config.command,
                args: config.args,
                cwd: config.cwd,
                env: config.env
            };
            this.setupProcessEventListeners(processInfo);
            this.processes.set(processId, processInfo);
            this.startHealthCheck(processId, config.healthCheckInterval || this.DEFAULT_HEALTH_CHECK_INTERVAL);
            await this.waitForProcessStart(childProcess, config.timeout || this.DEFAULT_TIMEOUT);
            console.log(`[MCP Process Manager] Server ${config.name} started successfully with ID: ${processId}`);
            this.emit('serverStarted', { processId, name: config.name });
            return processId;
        }
        catch (error) {
            console.error(`[MCP Process Manager] Failed to start server ${config.name}:`, error);
            this.emit('serverStartFailed', { name: config.name, error });
            throw error;
        }
    }
    async stopServer(processId) {
        const processInfo = this.processes.get(processId);
        if (!processInfo) {
            console.log(`[MCP Process Manager] Process ${processId} not found`);
            return false;
        }
        try {
            console.log(`[MCP Process Manager] Stopping server ${processInfo.name}...`);
            this.stopHealthCheck(processId);
            await this.gracefullyKillProcess(processInfo.process);
            this.processes.delete(processId);
            console.log(`[MCP Process Manager] Server ${processInfo.name} stopped successfully`);
            this.emit('serverStopped', { processId, name: processInfo.name });
            return true;
        }
        catch (error) {
            console.error(`[MCP Process Manager] Error stopping server ${processInfo.name}:`, error);
            this.emit('serverStopFailed', { processId, name: processInfo.name, error });
            return false;
        }
    }
    async stopAllServers() {
        console.log(`[MCP Process Manager] Stopping all servers...`);
        const stopPromises = Array.from(this.processes.keys()).map(processId => this.stopServer(processId));
        await Promise.allSettled(stopPromises);
        console.log(`[MCP Process Manager] All servers stopped`);
    }
    async restartServer(processId) {
        console.log(`[MCP Process Manager] Restarting server ${processId}`);
        const processInfo = this.processes.get(processId);
        if (!processInfo) {
            throw new Error(`Process ${processId} not found`);
        }
        await this.stopServer(processId);
        const newProcessId = await this.startServer({
            name: processInfo.name,
            command: processInfo.command,
            args: processInfo.args,
            cwd: processInfo.cwd,
            env: processInfo.env
        });
        console.log(`[MCP Process Manager] Server ${processId} restarted with new ID: ${newProcessId}`);
        return newProcessId;
    }
    getServerStatus(processId) {
        return this.processes.get(processId) || null;
    }
    getAllServerStatuses() {
        return Array.from(this.processes.values());
    }
    isServerRunning(serverName) {
        return Array.from(this.processes.values()).some(info => info.name === serverName &&
            info.process &&
            !info.process.killed &&
            info.isHealthy);
    }
    getRunningServerId(serverName) {
        const processInfo = Array.from(this.processes.values()).find(info => info.name === serverName &&
            info.process &&
            !info.process.killed &&
            info.isHealthy);
        return processInfo?.id || null;
    }
    setupProcessEventListeners(processInfo) {
        const { process, id } = processInfo;
        process.stdout?.on('data', (data) => {
            processInfo.lastActivity = new Date();
            this.emit('serverOutput', { processId: id, name: processInfo.name, data: data.toString() });
        });
        process.stderr?.on('data', (data) => {
            processInfo.lastActivity = new Date();
            this.emit('serverError', { processId: id, name: processInfo.name, data: data.toString() });
        });
        process.on('close', (code, signal) => {
            console.log(`[MCP Process Manager] Server ${processInfo.name} process closed with code ${code}, signal ${signal}`);
            this.handleProcessExit(processInfo, code, signal);
        });
        process.on('error', (error) => {
            console.error(`[MCP Process Manager] Server ${processInfo.name} process error:`, error);
            this.handleProcessError(processInfo, error);
        });
        process.on('exit', (code, signal) => {
            console.log(`[MCP Process Manager] Server ${processInfo.name} process exited with code ${code}, signal ${signal}`);
            this.handleProcessExit(processInfo, code, signal);
        });
    }
    handleProcessExit(processInfo, code, signal) {
        this.stopHealthCheck(processInfo.id);
        this.processes.delete(processInfo.id);
        if (code !== 0 && processInfo.restartCount < processInfo.maxRestarts) {
            console.log(`[MCP Process Manager] Attempting to restart server ${processInfo.name} (attempt ${processInfo.restartCount + 1}/${processInfo.maxRestarts})`);
            this.emit('serverRestarting', { name: processInfo.name, restartCount: processInfo.restartCount + 1 });
        }
        else if (processInfo.restartCount >= processInfo.maxRestarts) {
            console.error(`[MCP Process Manager] Server ${processInfo.name} exceeded max restart attempts`);
            this.emit('serverMaxRestartsExceeded', { name: processInfo.name, restartCount: processInfo.restartCount });
        }
        this.emit('serverExited', { processId: processInfo.id, name: processInfo.name, code, signal });
    }
    handleProcessError(processInfo, error) {
        processInfo.isHealthy = false;
        this.emit('serverError', { processId: processInfo.id, name: processInfo.name, error: error.message });
    }
    startHealthCheck(processId, interval) {
        const timer = setInterval(() => {
            this.performHealthCheck(processId);
        }, interval);
        this.healthCheckTimers.set(processId, timer);
    }
    stopHealthCheck(processId) {
        const timer = this.healthCheckTimers.get(processId);
        if (timer) {
            clearInterval(timer);
            this.healthCheckTimers.delete(processId);
        }
    }
    performHealthCheck(processId) {
        const processInfo = this.processes.get(processId);
        if (!processInfo)
            return;
        const now = new Date();
        const timeSinceLastActivity = now.getTime() - processInfo.lastActivity.getTime();
        const healthCheckThreshold = 60000;
        if (timeSinceLastActivity > healthCheckThreshold) {
            processInfo.isHealthy = false;
            console.warn(`[MCP Process Manager] Server ${processInfo.name} appears unresponsive (last activity: ${timeSinceLastActivity}ms ago)`);
            this.emit('serverUnhealthy', { processId, name: processInfo.name, timeSinceLastActivity });
        }
        else {
            processInfo.isHealthy = true;
        }
    }
    async gracefullyKillProcess(process) {
        return new Promise((resolve) => {
            process.kill('SIGTERM');
            const timeout = setTimeout(() => {
                process.kill('SIGKILL');
                resolve(false);
            }, 5000);
            process.once('exit', () => {
                clearTimeout(timeout);
                resolve(true);
            });
        });
    }
    async waitForProcessStart(process, timeout) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Process start timeout'));
            }, timeout);
            process.once('spawn', () => {
                clearTimeout(timeoutId);
                resolve();
            });
            process.once('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
            if (process.pid) {
                clearTimeout(timeoutId);
                resolve();
            }
        });
    }
    setupProcessCleanup() {
        process.on('SIGINT', async () => {
            console.log('\n[MCP Process Manager] Received SIGINT, cleaning up...');
            await this.stopAllServers();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.log('\n[MCP Process Manager] Received SIGTERM, cleaning up...');
            await this.stopAllServers();
            process.exit(0);
        });
        process.on('exit', () => {
            console.log('[MCP Process Manager] Application exiting, cleaning up...');
            this.stopAllServers();
        });
    }
    async executeCommand(processId, method, params) {
        const processInfo = this.processes.get(processId);
        if (!processInfo) {
            throw new Error(`Process ${processId} not found`);
        }
        const { process, name } = processInfo;
        if (!process || process.exitCode !== null) {
            console.log(`[MCP Process Manager] Process ${processId} is not running, attempting to restart...`);
            try {
                const newProcessId = await this.restartServer(processId);
                return this.executeCommand(newProcessId, method, params);
            }
            catch (restartError) {
                const errorMessage = restartError instanceof Error ? restartError.message : String(restartError);
                throw new Error(`Process ${processId} restart failed: ${errorMessage}`);
            }
        }
        return new Promise((resolve, reject) => {
            let output = '';
            let errorOutput = '';
            let isCompleted = false;
            const isK6Server = name.includes('k6') || name.includes('load-test');
            const isPlaywrightServer = name.includes('playwright') || name.includes('browser');
            const onData = (data) => {
                if (isCompleted)
                    return;
                const dataStr = data.toString();
                output += dataStr;
                if (isK6Server) {
                    if (dataStr.includes('█ TOTAL RESULTS') ||
                        dataStr.includes('http_req_duration') ||
                        dataStr.includes('iterations') ||
                        dataStr.includes('execution: local')) {
                        if (!isCompleted) {
                            isCompleted = true;
                            cleanup();
                            resolve({
                                success: true,
                                output: output,
                                metrics: this.parseK6Metrics(output)
                            });
                        }
                    }
                }
                try {
                    const response = JSON.parse(output);
                    if (!isCompleted) {
                        isCompleted = true;
                        cleanup();
                        resolve(response);
                    }
                }
                catch (error) {
                }
            };
            const onErrorData = (data) => {
                const dataStr = data.toString();
                errorOutput += dataStr;
                if (dataStr.includes('Error:') || dataStr.includes('level=error')) {
                    if (!isCompleted) {
                        isCompleted = true;
                        cleanup();
                        let errorMessage = '';
                        if (isK6Server) {
                            errorMessage = `k6 execution error: ${dataStr}`;
                        }
                        else if (isPlaywrightServer) {
                            errorMessage = `Playwright execution error: ${dataStr}`;
                        }
                        else {
                            errorMessage = `${name} execution error: ${dataStr}`;
                        }
                        reject(new Error(errorMessage));
                    }
                }
            };
            const onError = (error) => {
                if (!isCompleted) {
                    isCompleted = true;
                    cleanup();
                    reject(error);
                }
            };
            const onClose = (code) => {
                if (!isCompleted) {
                    isCompleted = true;
                    cleanup();
                    if (code === 0) {
                        const result = {
                            success: true,
                            output: output
                        };
                        if (isK6Server) {
                            result.metrics = this.parseK6Metrics(output);
                        }
                        resolve(result);
                    }
                    else {
                        let errorMessage = '';
                        if (isK6Server) {
                            errorMessage = `k6 process exited with code ${code}: ${errorOutput}`;
                        }
                        else if (isPlaywrightServer) {
                            errorMessage = `Playwright process exited with code ${code}: ${errorOutput}`;
                        }
                        else {
                            errorMessage = `${name} process exited with code ${code}: ${errorOutput}`;
                        }
                        reject(new Error(errorMessage));
                    }
                }
            };
            if (process.stdout) {
                process.stdout.on('data', onData);
            }
            if (process.stderr) {
                process.stderr.on('data', onErrorData);
            }
            process.once('error', onError);
            process.once('close', onClose);
            const request = { method, params };
            if (process.stdin) {
                process.stdin.write(JSON.stringify(request) + '\n');
            }
            else {
                reject(new Error('Process stdin is not available'));
                return;
            }
            const timeoutDuration = isK6Server ? 600000 : 600000;
            const timeout = setTimeout(() => {
                if (!isCompleted) {
                    isCompleted = true;
                    cleanup();
                    let timeoutMessage = '';
                    if (isK6Server) {
                        timeoutMessage = 'k6 command execution timeout';
                    }
                    else if (isPlaywrightServer) {
                        timeoutMessage = 'Playwright command execution timeout';
                    }
                    else {
                        timeoutMessage = `${name} command execution timeout`;
                    }
                    reject(new Error(timeoutMessage));
                }
            }, timeoutDuration);
            const cleanup = () => {
                clearTimeout(timeout);
                if (process.stdout) {
                    process.stdout.removeListener('data', onData);
                }
                if (process.stderr) {
                    process.stderr.removeListener('data', onErrorData);
                }
                process.removeListener('error', onError);
                process.removeListener('close', onClose);
            };
        });
    }
    parseK6Metrics(output) {
        const metrics = {};
        const durationMatch = output.match(/http_req_duration.*?p\(95\)=(\d+\.?\d*)ms/);
        if (durationMatch && durationMatch[1]) {
            metrics.http_req_duration_p95 = parseFloat(durationMatch[1]);
        }
        const failedMatch = output.match(/http_req_failed.*?(\d+\.?\d*)%/);
        if (failedMatch && failedMatch[1]) {
            metrics.http_req_failed_rate = parseFloat(failedMatch[1]);
        }
        const iterationsMatch = output.match(/iterations.*?(\d+)/);
        if (iterationsMatch && iterationsMatch[1]) {
            metrics.iterations = parseInt(iterationsMatch[1]);
        }
        return metrics;
    }
    getResourceUsage() {
        const totalProcesses = this.processes.size;
        const healthyProcesses = Array.from(this.processes.values()).filter(info => info.isHealthy).length;
        const estimatedMemoryPerProcess = 50;
        const memoryUsage = totalProcesses * estimatedMemoryPerProcess;
        return {
            totalProcesses,
            healthyProcesses,
            memoryUsage
        };
    }
}
exports.MCPProcessManager = MCPProcessManager;
//# sourceMappingURL=mcp-process-manager.js.map