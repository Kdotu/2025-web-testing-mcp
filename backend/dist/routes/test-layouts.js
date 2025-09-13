"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testLayoutRoutes = void 0;
const express_1 = require("express");
const test_layout_controller_1 = require("../controllers/test-layout-controller");
const router = (0, express_1.Router)();
exports.testLayoutRoutes = router;
const testLayoutController = new test_layout_controller_1.TestLayoutController();
router.get('/', (req, res) => testLayoutController.getAllLayouts(req, res));
router.get('/test-type/:testType', (req, res) => testLayoutController.getLayoutsByTestType(req, res));
router.get('/:id', (req, res) => testLayoutController.getLayoutById(req, res));
router.post('/', (req, res) => testLayoutController.createLayout(req, res));
router.put('/:id', (req, res) => testLayoutController.updateLayout(req, res));
router.delete('/:id', (req, res) => testLayoutController.deleteLayout(req, res));
router.post('/sections', (req, res) => testLayoutController.createSection(req, res));
router.post('/fields', (req, res) => testLayoutController.createField(req, res));
//# sourceMappingURL=test-layouts.js.map