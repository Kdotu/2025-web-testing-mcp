"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentationController = void 0;
const documentation_service_1 = require("../services/documentation-service");
const error_handler_1 = require("../middleware/error-handler");
const fs = __importStar(require("fs-extra"));
class DocumentationController {
    constructor() {
        this.generateHtmlReport = async (req, res, next) => {
            try {
                const { testId } = req.params;
                if (!testId) {
                    throw (0, error_handler_1.createValidationError)('테스트 ID가 필요합니다.');
                }
                const result = await this.documentationService.generateHtmlReport(testId);
                res.status(201).json({
                    success: true,
                    data: result,
                    message: 'HTML 리포트가 생성되었습니다.',
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.generatePdfReport = async (req, res, next) => {
            try {
                const { testId } = req.params;
                if (!testId) {
                    throw (0, error_handler_1.createValidationError)('테스트 ID가 필요합니다.');
                }
                const result = await this.documentationService.generatePdfReport(testId);
                res.status(201).json({
                    success: true,
                    data: result,
                    message: 'PDF 리포트가 생성되었습니다.',
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getDocuments = async (req, res, next) => {
            try {
                const { testId, type } = req.query;
                console.log('문서 목록 조회 API 호출 - testId:', testId, 'type:', type);
                const documents = await this.documentationService.getDocuments(testId, type);
                console.log('API 응답 문서 목록:', documents.map(doc => ({ id: doc.id, filename: doc.filename })));
                res.json({
                    success: true,
                    data: documents,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('문서 목록 조회 API 오류:', error);
                next(error);
            }
        };
        this.deleteDocument = async (req, res, next) => {
            try {
                const { documentId } = req.params;
                if (!documentId) {
                    throw (0, error_handler_1.createValidationError)('문서 ID가 필요합니다.');
                }
                await this.documentationService.deleteDocument(documentId);
                res.json({
                    success: true,
                    message: '문서가 삭제되었습니다.',
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.downloadDocument = async (req, res, next) => {
            try {
                const { documentId } = req.params;
                console.log('문서 다운로드 요청 - documentId:', documentId);
                if (!documentId) {
                    throw (0, error_handler_1.createValidationError)('문서 ID가 필요합니다.');
                }
                const documents = await this.documentationService.getDocuments();
                console.log('사용 가능한 문서 목록:', documents.map(doc => ({ id: doc.id, filename: doc.filename })));
                let document = documents.find(doc => doc.id === documentId);
                console.log('일반 방법으로 찾은 문서:', document);
                if (!document) {
                    console.log('일반 방법으로 문서를 찾지 못함, 파일명으로 검색 시도');
                    const testIdMatch = documentId.match(/report_(.+?)_(\d+)/);
                    if (testIdMatch) {
                        const testId = testIdMatch[1];
                        const timestamp = testIdMatch[2];
                        const htmlFilename = `report_${testId}_${timestamp}.html`;
                        const htmlDocument = await this.documentationService.findDocumentByFilename(htmlFilename);
                        if (htmlDocument) {
                            document = htmlDocument;
                        }
                        else {
                            const pdfFilename = `report_${testId}_${timestamp}.pdf`;
                            const pdfDocument = await this.documentationService.findDocumentByFilename(pdfFilename);
                            if (pdfDocument) {
                                document = pdfDocument;
                            }
                        }
                    }
                }
                if (!document) {
                    console.error('문서를 찾을 수 없음 - documentId:', documentId);
                    throw (0, error_handler_1.createValidationError)('문서를 찾을 수 없습니다.');
                }
                console.log('최종 찾은 문서:', document);
                if (!await fs.pathExists(document.filepath)) {
                    console.error('파일이 존재하지 않음 - filepath:', document.filepath);
                    throw (0, error_handler_1.createValidationError)('파일이 존재하지 않습니다.');
                }
                try {
                    await fs.access(document.filepath, fs.constants.R_OK);
                }
                catch (accessError) {
                    console.error('파일 읽기 권한 없음 - filepath:', document.filepath, 'error:', accessError.message);
                    throw (0, error_handler_1.createValidationError)('파일을 읽을 수 있는 권한이 없습니다.');
                }
                const stats = await fs.stat(document.filepath);
                if (stats.size === 0) {
                    console.error('파일이 비어있음 - filepath:', document.filepath);
                    throw (0, error_handler_1.createValidationError)('파일이 비어있습니다.');
                }
                console.log('파일 다운로드 시작 - filepath:', document.filepath, 'size:', stats.size);
                const fileStream = fs.createReadStream(document.filepath);
                const contentType = document.type === 'pdf'
                    ? 'application/pdf'
                    : 'text/html';
                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
                res.setHeader('Content-Length', stats.size.toString());
                fileStream.pipe(res);
                fileStream.on('error', (streamError) => {
                    console.error('파일 스트림 에러:', streamError);
                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            error: '파일 읽기 중 오류가 발생했습니다.',
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }
            catch (error) {
                console.error('문서 다운로드 오류:', error);
                next(error);
            }
        };
        this.previewDocument = async (req, res, next) => {
            try {
                const { documentId } = req.params;
                if (!documentId) {
                    throw (0, error_handler_1.createValidationError)('문서 ID가 필요합니다.');
                }
                const documents = await this.documentationService.getDocuments();
                const document = documents.find(doc => doc.id === documentId);
                if (!document) {
                    throw (0, error_handler_1.createValidationError)('문서를 찾을 수 없습니다.');
                }
                if (document.type !== 'html') {
                    throw (0, error_handler_1.createValidationError)('HTML 문서만 미리보기가 가능합니다.');
                }
                if (!await fs.pathExists(document.filepath)) {
                    throw (0, error_handler_1.createValidationError)('파일이 존재하지 않습니다.');
                }
                const htmlContent = await fs.readFile(document.filepath, 'utf8');
                res.setHeader('Content-Type', 'text/html');
                res.send(htmlContent);
            }
            catch (error) {
                next(error);
            }
        };
        this.getDocumentStats = async (_req, res, next) => {
            try {
                const documents = await this.documentationService.getDocuments();
                const stats = {
                    total: documents.length,
                    html: documents.filter(doc => doc.type === 'html').length,
                    pdf: documents.filter(doc => doc.type === 'pdf').length,
                    totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
                    recentDocuments: documents.slice(0, 5)
                };
                res.json({
                    success: true,
                    data: stats,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.documentationService = new documentation_service_1.DocumentationService();
    }
}
exports.DocumentationController = DocumentationController;
//# sourceMappingURL=documentation-controller.js.map