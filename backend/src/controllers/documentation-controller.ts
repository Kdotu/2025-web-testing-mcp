import { Request, Response, NextFunction } from 'express';
import { DocumentationService } from '../services/documentation-service';
import { createValidationError } from '../middleware/error-handler';
import * as fs from 'fs-extra';

export class DocumentationController {
  private documentationService: DocumentationService;

  constructor() {
    this.documentationService = new DocumentationService();
  }

  /**
   * HTML 리포트 생성
   */
  generateHtmlReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { testId } = req.params;

      if (!testId) {
        throw createValidationError('테스트 ID가 필요합니다.');
      }

      const result = await this.documentationService.generateHtmlReport(testId);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'HTML 리포트가 생성되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PDF 리포트 생성
   */
  generatePdfReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { testId } = req.params;

      if (!testId) {
        throw createValidationError('테스트 ID가 필요합니다.');
      }

      const result = await this.documentationService.generatePdfReport(testId);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'PDF 리포트가 생성되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 문서 목록 조회
   */
  getDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { testId, type } = req.query;
      console.log('문서 목록 조회 API 호출 - testId:', testId, 'type:', type);

      const documents = await this.documentationService.getDocuments(
        testId as string,
        type as 'html' | 'pdf'
      );
      
      console.log('API 응답 문서 목록:', documents.map(doc => ({ id: doc.id, filename: doc.filename })));
      
      res.json({
        success: true,
        data: documents,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('문서 목록 조회 API 오류:', error);
      next(error);
    }
  }

  /**
   * 문서 삭제
   */
  deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;

      if (!documentId) {
        throw createValidationError('문서 ID가 필요합니다.');
      }

      await this.documentationService.deleteDocument(documentId);
      
      res.json({
        success: true,
        message: '문서가 삭제되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 문서 다운로드
   */
  downloadDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      console.log('문서 다운로드 요청 - documentId:', documentId);

      if (!documentId) {
        throw createValidationError('문서 ID가 필요합니다.');
      }

      // 먼저 일반적인 방법으로 문서 찾기
      const documents = await this.documentationService.getDocuments();
      console.log('사용 가능한 문서 목록:', documents.map(doc => ({ id: doc.id, filename: doc.filename })));
      
      let document = documents.find(doc => doc.id === documentId);
      console.log('일반 방법으로 찾은 문서:', document);
      
      // 일반적인 방법으로 찾지 못한 경우, 파일명으로 직접 찾기
      if (!document) {
        console.log('일반 방법으로 문서를 찾지 못함, 파일명으로 검색 시도');
        
        // documentId에서 파일명 추출 시도
        const testIdMatch = documentId.match(/report_(.+?)_(\d+)/);
        if (testIdMatch) {
          const testId = testIdMatch[1];
          const timestamp = testIdMatch[2];
          
          // HTML 파일 먼저 확인
          const htmlFilename = `report_${testId}_${timestamp}.html`;
          const htmlDocument = await this.documentationService.findDocumentByFilename(htmlFilename);
          
          // HTML 파일이 없으면 PDF 파일 확인
          if (htmlDocument) {
            document = htmlDocument;
          } else {
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
        throw createValidationError('문서를 찾을 수 없습니다.');
      }

      console.log('최종 찾은 문서:', document);

      if (!await fs.pathExists(document.filepath)) {
        console.error('파일이 존재하지 않음 - filepath:', document.filepath);
        throw createValidationError('파일이 존재하지 않습니다.');
      }

      console.log('파일 다운로드 시작 - filepath:', document.filepath);
      
      // 파일 스트림 생성
      const fileStream = fs.createReadStream(document.filepath);
      
      // Content-Type 설정
      const contentType = document.type === 'pdf' 
        ? 'application/pdf' 
        : 'text/html';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
      
      // 파일 스트림을 응답으로 전송
      fileStream.pipe(res);
    } catch (error) {
      console.error('문서 다운로드 오류:', error);
      next(error);
    }
  }

  /**
   * 문서 미리보기 (HTML만)
   */
  previewDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;

      if (!documentId) {
        throw createValidationError('문서 ID가 필요합니다.');
      }

      const documents = await this.documentationService.getDocuments();
      const document = documents.find(doc => doc.id === documentId);
      
      if (!document) {
        throw createValidationError('문서를 찾을 수 없습니다.');
      }

      if (document.type !== 'html') {
        throw createValidationError('HTML 문서만 미리보기가 가능합니다.');
      }

      if (!await fs.pathExists(document.filepath)) {
        throw createValidationError('파일이 존재하지 않습니다.');
      }

      const htmlContent = await fs.readFile(document.filepath, 'utf8');
      
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 문서 통계
   */
  getDocumentStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const documents = await this.documentationService.getDocuments();
      
      const stats = {
        total: documents.length,
        html: documents.filter(doc => doc.type === 'html').length,
        pdf: documents.filter(doc => doc.type === 'pdf').length,
        totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
        recentDocuments: documents.slice(0, 5) // 최근 5개 문서
      };
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
} 