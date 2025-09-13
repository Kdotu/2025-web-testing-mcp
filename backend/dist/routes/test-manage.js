"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const test_manage_controller_1 = require("../controllers/test-manage-controller");
const router = (0, express_1.Router)();
const testManageController = new test_manage_controller_1.TestManageController();
router.get('/status/:testId', (req, res, next) => testManageController.getTestStatus(req, res, next));
router.delete('/cancel/:testId', (req, res, next) => testManageController.cancelTest(req, res, next));
router.put('/status/:testId', (req, res, next) => testManageController.updateTestStatus(req, res, next));
exports.default = router;
//# sourceMappingURL=test-manage.js.map