"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.settingsRoutes = router;
router.get('/', async (_req, res, next) => {
    try {
        const defaultSettings = {
            apiUrl: process.env['VITE_API_BASE_URL'] || 'http://localhost:3101',
            demoMode: false,
            autoRefresh: true,
            refreshInterval: 5000,
            maxResults: 1000,
            theme: 'light',
            language: 'ko'
        };
        res.json({
            success: true,
            data: defaultSettings,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const settings = req.body;
        res.json({
            success: true,
            data: settings,
            message: 'Settings saved successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=settings.js.map