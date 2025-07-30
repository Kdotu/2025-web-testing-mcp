"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const error_handler_1 = require("./middleware/error-handler");
const load_tests_1 = require("./routes/load-tests");
const test_results_1 = require("./routes/test-results");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env['PORT'] || 3000;
app.use((0, cors_1.default)({
    origin: process.env['CORS_ORIGIN'] || ['http://localhost:3100', 'http://localhost:5173'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
app.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'k6 MCP Backend Server is running',
        timestamp: new Date().toISOString()
    });
});
app.use('/api/load-tests', load_tests_1.loadTestRoutes);
app.use('/api/test-results', test_results_1.testResultRoutes);
app.use('*', (_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        timestamp: new Date().toISOString()
    });
});
app.use(error_handler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`🚀 k6 MCP Backend Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Environment: ${process.env['NODE_ENV'] || 'development'}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map