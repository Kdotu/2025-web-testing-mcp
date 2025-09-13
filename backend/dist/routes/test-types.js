"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testTypeRoutes = void 0;
const express_1 = require("express");
const test_type_controller_1 = require("../controllers/test-type-controller");
const router = (0, express_1.Router)();
exports.testTypeRoutes = router;
const testTypeController = new test_type_controller_1.TestTypeController();
router.get('/', async (req, res, next) => {
    await testTypeController.getAllTestTypes(req, res, next);
});
router.get('/enabled', async (req, res, next) => {
    await testTypeController.getEnabledTestTypes(req, res, next);
});
router.post('/', async (req, res, next) => {
    await testTypeController.addTestType(req, res, next);
});
router.put('/:id', async (req, res, next) => {
    await testTypeController.updateTestType(req, res, next);
});
router.delete('/:id', async (req, res, next) => {
    await testTypeController.deleteTestType(req, res, next);
});
router.patch('/:id/toggle', async (req, res, next) => {
    await testTypeController.toggleTestType(req, res, next);
});
//# sourceMappingURL=test-types.js.map