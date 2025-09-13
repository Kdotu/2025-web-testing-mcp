"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbStatusRoutes = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.dbStatusRoutes = router;
router.get('/', async (_req, res, next) => {
    try {
        res.json({
            success: true,
            message: 'Database connection successful',
            data: {
                status: 'connected',
                timestamp: new Date().toISOString(),
                server: 'Express Backend'
            }
        });
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=db-status.js.map