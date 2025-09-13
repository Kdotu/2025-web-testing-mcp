"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentation_controller_1 = require("../controllers/documentation-controller");
const router = (0, express_1.Router)();
const documentationController = new documentation_controller_1.DocumentationController();
router.post('/html/:testId', documentationController.generateHtmlReport);
router.post('/pdf/:testId', documentationController.generatePdfReport);
router.get('/', documentationController.getDocuments);
router.get('/stats', documentationController.getDocumentStats);
router.get('/:documentId/download', documentationController.downloadDocument);
router.get('/:documentId/preview', documentationController.previewDocument);
router.delete('/:documentId', documentationController.deleteDocument);
exports.default = router;
//# sourceMappingURL=documents.js.map