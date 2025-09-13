"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSettingsRoutes = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.saveSettingsRoutes = router;
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
//# sourceMappingURL=save-settings.js.map