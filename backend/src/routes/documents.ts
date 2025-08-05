import { Router } from 'express';
import { DocumentationController } from '../controllers/documentation-controller';

const router = Router();
const documentationController = new DocumentationController();

// HTML 리포트 생성
router.post('/html/:testId', documentationController.generateHtmlReport);

// PDF 리포트 생성
router.post('/pdf/:testId', documentationController.generatePdfReport);

// 문서 목록 조회
router.get('/', documentationController.getDocuments);

// 문서 통계
router.get('/stats', documentationController.getDocumentStats);

// 문서 다운로드
router.get('/:documentId/download', documentationController.downloadDocument);

// 문서 미리보기 (HTML만)
router.get('/:documentId/preview', documentationController.previewDocument);

// 문서 삭제
router.delete('/:documentId', documentationController.deleteDocument);

export default router; 