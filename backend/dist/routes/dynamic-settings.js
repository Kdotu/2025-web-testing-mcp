"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicSettingsRoutes = void 0;
const express_1 = require("express");
const dynamic_settings_controller_1 = require("../controllers/dynamic-settings-controller");
const router = (0, express_1.Router)();
exports.dynamicSettingsRoutes = router;
const dynamicSettingsController = new dynamic_settings_controller_1.DynamicSettingsController();
router.get('/form/:testType', dynamicSettingsController.generateSettingsForm);
router.post('/validate/field/:fieldId', dynamicSettingsController.validateField);
router.post('/save/:testType', dynamicSettingsController.saveSettings);
router.get('/load/:testType', dynamicSettingsController.loadSettings);
router.post('/validate/:testType', dynamicSettingsController.validateSettings);
router.post('/convert/:testType', dynamicSettingsController.convertToTestConfig);
//# sourceMappingURL=dynamic-settings.js.map