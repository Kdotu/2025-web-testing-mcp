"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSettingsRoutes = void 0;
const express_1 = require("express");
const test_settings_controller_1 = require("../controllers/test-settings-controller");
const router = (0, express_1.Router)();
exports.testSettingsRoutes = router;
const testSettingsController = new test_settings_controller_1.TestSettingsController();
router.get('/', (req, res) => testSettingsController.getAllSettings(req, res));
router.get('/:id', (req, res) => testSettingsController.getSettingById(req, res));
router.post('/', (req, res) => testSettingsController.createSetting(req, res));
router.put('/:id', (req, res) => testSettingsController.updateSetting(req, res));
router.delete('/:id', (req, res) => testSettingsController.deleteSetting(req, res));
router.get('/category/:category', (req, res) => testSettingsController.getSettingsByCategory(req, res));
router.get('/search', (req, res) => testSettingsController.searchSettings(req, res));
//# sourceMappingURL=test-settings.js.map