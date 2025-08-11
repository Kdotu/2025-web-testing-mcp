import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { TestResultService } from './test-result-service';
import { TestMetricService } from './test-metric-service';

interface ReportData {
  testResult: any;
  metrics: any[];
  testType: any;
  generatedAt: string;
  reportId: string;
}

interface DocumentInfo {
  id: string;
  testId: string;
  type: 'html' | 'pdf';
  filename: string;
  filepath: string;
  size: number;
  createdAt: string;
  url?: string;
}

export class DocumentationService {
  private testResultService: TestResultService;
  private testMetricService: TestMetricService;
  private reportsDir: string;
  private templatesDir: string;

  constructor() {
    this.testResultService = new TestResultService();
    this.testMetricService = new TestMetricService();
    
    // 문서 저장 디렉토리 설정 - 로컬 환경 호환성 개선
    this.reportsDir = this.resolveReportsDirectory();
    this.templatesDir = this.resolveTemplatesDirectory();
    
    this.ensureDirectories();
    this.registerHandlebarsHelpers();
  }

  /**
   * Reports 디렉토리 경로 해결 - 로컬 환경 호환성 개선
   */
  private resolveReportsDirectory(): string {
    // 여러 경로 옵션을 시도
    const possiblePaths = [
      // 1. 현재 작업 디렉토리 기준 (로컬 개발 환경)
      path.join(process.cwd(), 'reports'),
      // 2. 실행 파일 위치 기준 (빌드된 환경)
      path.join(__dirname, '../../reports'),
      // 3. 프로젝트 루트 기준 (절대 경로)
      path.resolve(process.cwd(), 'backend', 'reports'),
      // 4. 환경 변수로 지정된 경로
      process.env['REPORTS_DIR'] || '',
      // 5. 사용자 홈 디렉토리 기준 (fallback)
      path.join(process.env['HOME'] || process.env['USERPROFILE'] || '', '.web-testing-mcp', 'reports')
    ];

    // 존재하는 첫 번째 경로 사용
    for (const dirPath of possiblePaths) {
      if (dirPath && dirPath !== '') {
        try {
          if (fs.existsSync(dirPath)) {
            console.log(`Using existing reports directory: ${dirPath}`);
            return dirPath;
          }
        } catch (error: any) {
          console.log(`Path check failed for: ${dirPath}`, error.message);
        }
      }
    }

    // 기본 경로 사용 (자동 생성됨)
    const defaultPath = path.join(process.cwd(), 'reports');
    console.log(`Using default reports directory: ${defaultPath}`);
    return defaultPath;
  }

  /**
   * Templates 디렉토리 경로 해결 - 로컬 환경 호환성 개선
   */
  private resolveTemplatesDirectory(): string {
    // 여러 경로 옵션을 시도
    const possiblePaths = [
      // 1. 현재 작업 디렉토리 기준 (로컬 개발 환경)
      path.join(process.cwd(), 'templates'),
      // 2. 실행 파일 위치 기준 (빌드된 환경)
      path.join(__dirname, '../../templates'),
      // 3. 프로젝트 루트 기준 (절대 경로)
      path.resolve(process.cwd(), 'backend', 'templates'),
      // 4. 환경 변수로 지정된 경로
      process.env['TEMPLATES_DIR'] || '',
      // 5. 사용자 홈 디렉토리 기준 (fallback)
      path.join(process.env['HOME'] || process.env['USERPROFILE'] || '', '.web-testing-mcp', 'templates')
    ];

    // 존재하는 첫 번째 경로 사용
    for (const dirPath of possiblePaths) {
      if (dirPath && dirPath !== '') {
        try {
          if (fs.existsSync(dirPath)) {
            console.log(`Using existing templates directory: ${dirPath}`);
            return dirPath;
          }
        } catch (error: any) {
          console.log(`Path check failed for: ${dirPath}`, error.message);
        }
      }
    }

    // 기본 경로 사용 (자동 생성됨)
    const defaultPath = path.join(process.cwd(), 'templates');
    console.log(`Using default templates directory: ${defaultPath}`);
    return defaultPath;
  }

  /**
   * 필요한 디렉토리 생성
   */
  private ensureDirectories(): void {
    try {
      // 메인 디렉토리들 생성
      fs.ensureDirSync(this.reportsDir);
      fs.ensureDirSync(this.templatesDir);
      
      // 하위 디렉토리들 생성
      const htmlDir = path.join(this.reportsDir, 'html');
      const pdfDir = path.join(this.reportsDir, 'pdf');
      
      fs.ensureDirSync(htmlDir);
      fs.ensureDirSync(pdfDir);
      
      console.log(`Reports directory structure created successfully:`);
      console.log(`  - Main: ${this.reportsDir}`);
      console.log(`  - HTML: ${htmlDir}`);
      console.log(`  - PDF: ${pdfDir}`);
      console.log(`  - Templates: ${this.templatesDir}`);
      
      // 디렉토리 권한 확인 및 설정
      this.checkDirectoryPermissions();
      
    } catch (error: any) {
      console.error('Failed to create reports directory structure:', error);
      throw new Error(`Reports directory creation failed: ${error.message}`);
    }
  }

  /**
   * 디렉토리 권한 확인 및 설정
   */
  private checkDirectoryPermissions(): void {
    try {
      // 읽기 권한 확인
      fs.accessSync(this.reportsDir, fs.constants.R_OK);
      fs.accessSync(this.reportsDir, fs.constants.W_OK);
      
      // 하위 디렉토리 권한 확인
      const htmlDir = path.join(this.reportsDir, 'html');
      const pdfDir = path.join(this.reportsDir, 'pdf');
      
      fs.accessSync(htmlDir, fs.constants.R_OK | fs.constants.W_OK);
      fs.accessSync(pdfDir, fs.constants.R_OK | fs.constants.W_OK);
      
      console.log('Directory permissions verified successfully');
      
    } catch (error: any) {
      console.warn('Directory permission warning:', error.message);
      console.log('Attempting to fix permissions...');
      
      try {
        // 권한 수정 시도 (Unix/Linux 환경)
        if (process.platform !== 'win32') {
          const { execSync } = require('child_process');
          execSync(`chmod -R 755 "${this.reportsDir}"`);
          console.log('Directory permissions updated');
        }
      } catch (permError: any) {
        console.warn('Permission fix failed:', permError.message);
      }
    }
  }

  /**
   * Handlebars 헬퍼 함수 등록
   */
  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('formatDate', function(date: string) {
      return new Date(date).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    });

    Handlebars.registerHelper('formatDuration', function(seconds: number) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) {
        return `${hours}시간 ${minutes}분 ${secs}초`;
      } else if (minutes > 0) {
        return `${minutes}분 ${secs}초`;
      } else {
        return `${secs}초`;
      }
    });

    Handlebars.registerHelper('formatMetricValue', function(value: number, unit: string) {
      if (unit === 'ms') {
        return `${value.toFixed(2)}ms`;
      } else if (unit === 'req/s') {
        return `${value.toFixed(2)} req/s`;
      } else if (unit === '%') {
        return `${value.toFixed(2)}%`;
      } else {
        return `${value} ${unit}`;
      }
    });

    Handlebars.registerHelper('getStatusColor', function(status: string) {
      switch (status) {
        case 'completed': return 'success';
        case 'failed': return 'danger';
        case 'running': return 'warning';
        case 'cancelled': return 'secondary';
        default: return 'info';
      }
    });

    Handlebars.registerHelper('getStatusText', function(status: string) {
      switch (status) {
        case 'completed': return '완료';
        case 'failed': return '실패';
        case 'running': return '실행 중';
        case 'cancelled': return '취소됨';
        default: return '알 수 없음';
      }
    });
  }

  /**
   * HTML 리포트 생성
   */
  async generateHtmlReport(testId: string): Promise<DocumentInfo> {
    try {
      console.log('HTML 리포트 생성 시작 - testId:', testId);
      
      // 테스트 결과 데이터 수집
      // testId가 UUID 형식인지 확인하고 적절한 메서드 사용
      let testResult = await this.testResultService.getResultById(testId);
      if (!testResult) {
        // UUID로 찾지 못한 경우 test_id로 다시 시도
        testResult = await this.testResultService.getResultByTestId(testId);
      }
      if (!testResult) {
        throw new Error('테스트 결과를 찾을 수 없습니다.');
      }

      console.log('테스트 결과 찾음:', testResult.id);

      const metrics = await this.testMetricService.getMetricsByTestId(testId);
      console.log('메트릭 수:', metrics.length);
      
      // 테스트 타입 정보는 testResult에서 직접 사용
      const testType = {
        name: testResult.testType || 'Unknown',
        description: 'Test type from result'
      };

      const reportData: ReportData = {
        testResult,
        metrics,
        testType,
        generatedAt: new Date().toISOString(),
        reportId: `report_${testId}_${Date.now()}`
      };

      // HTML 템플릿 생성
      const htmlContent = await this.generateHtmlTemplate(reportData);
      
      // 파일 저장
      const timestamp = Date.now();
      const filename = `report_${testId}_${timestamp}.html`;
      const filepath = path.join(this.reportsDir, 'html', filename);
      
      console.log('HTML 파일 저장 - filepath:', filepath);
      await fs.writeFile(filepath, htmlContent, 'utf8');
      
      const stats = await fs.stat(filepath);
      
      // ID를 파일명 기반으로 생성하여 일치시킴
      const documentId = `report_${testId}_${timestamp}`;
      
      const result: DocumentInfo = {
        id: documentId,
        testId,
        type: 'html',
        filename,
        filepath,
        size: stats.size,
        createdAt: new Date().toISOString()
      };
      
      console.log('HTML 리포트 생성 완료 - documentId:', documentId);
      return result;
    } catch (error) {
      console.error('HTML 리포트 생성 실패:', error);
      throw error;
    }
  }

  /**
   * HTML 템플릿 생성
   */
  private async generateHtmlTemplate(data: ReportData): Promise<string> {
    try {
      // 템플릿 파일 경로
      const templatePath = path.join(this.templatesDir, 'report-template.hbs');
      
      // 템플릿 파일이 존재하는지 확인
      if (!await fs.pathExists(templatePath)) {
        console.error('템플릿 파일이 존재하지 않음:', templatePath);
        throw new Error('템플릿 파일을 찾을 수 없습니다.');
      }
      
      // 템플릿 파일 읽기
      const template = await fs.readFile(templatePath, 'utf8');
      console.log('템플릿 파일 로드 완료:', templatePath);
      
      // Handlebars로 템플릿 컴파일 및 렌더링
      const compiledTemplate = Handlebars.compile(template);
      const htmlContent = compiledTemplate(data);
      
      console.log('HTML 템플릿 렌더링 완료');
      return htmlContent;
    } catch (error) {
      console.error('HTML 템플릿 생성 실패:', error);
      throw error;
    }
  }

  /**
   * PDF 리포트 생성
   */
  async generatePdfReport(testId: string): Promise<DocumentInfo> {
    try {
      // HTML 리포트 먼저 생성 (이미 수정된 generateHtmlReport 사용)
      const htmlReport = await this.generateHtmlReport(testId);
      
      // Puppeteer 모듈 확인
      let puppeteer;
      try {
        puppeteer = require('puppeteer');
      } catch (error: any) {
        console.error('Puppeteer 모듈을 찾을 수 없습니다:', error.message);
        throw new Error('PDF 생성을 위해 Puppeteer가 필요합니다. "npm install puppeteer"를 실행해주세요.');
      }
      
      // HTML을 PDF로 변환
      const pdfFilename = htmlReport.filename.replace('.html', '.pdf');
      const pdfFilepath = path.join(this.reportsDir, 'pdf', pdfFilename);
      
      console.log('PDF 생성 시작 - HTML 파일:', htmlReport.filepath);
      console.log('PDF 저장 경로:', pdfFilepath);
      
      // HTML 파일 내용을 직접 읽어서 PDF 생성
      const htmlContent = await fs.readFile(htmlReport.filepath, 'utf8');
      
      // Puppeteer를 사용하여 PDF 생성
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process'
        ]
      });
      
      const page = await browser.newPage();
      
      // HTML 내용을 직접 설정 (파일 경로 문제 해결)
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // PDF 생성 전 페이지 로딩 대기 및 스타일 적용 확인
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 페이지 크기 설정 (A4 기준)
      await page.setViewport({
        width: 794,  // A4 너비 (72 DPI 기준)
        height: 1123, // A4 높이 (72 DPI 기준)
        deviceScaleFactor: 1
      });
      
      console.log('PDF 생성 중...');
      
      // PDF 생성 시 더 안정적인 옵션 사용
      const pdfData = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true,
        timeout: 30000
      });
      
      await browser.close();
      
      // PDF 파일에 버퍼 내용 직접 쓰기
      await fs.writeFile(pdfFilepath, pdfData);
      
      // PDF 파일 존재 여부 및 크기 확인
      if (!await fs.pathExists(pdfFilepath)) {
        throw new Error('PDF 파일이 생성되지 않았습니다.');
      }
      
      const stats = await fs.stat(pdfFilepath);
      console.log('PDF 생성 완료 - 파일 크기:', stats.size, 'bytes');
      
      // 파일 크기가 너무 작으면 생성 실패로 간주
      if (stats.size < 1000) {
        throw new Error(`PDF 파일이 너무 작습니다 (${stats.size} bytes). 생성에 실패했을 수 있습니다.`);
      }
      
      // PDF 파일 유효성 검증 (PDF 시그니처 확인)
      const pdfFileBuffer = await fs.readFile(pdfFilepath);
      const pdfHeader = pdfFileBuffer.slice(0, 4).toString('ascii');
      if (pdfHeader !== '%PDF') {
        throw new Error('생성된 파일이 유효한 PDF가 아닙니다. PDF 헤더를 찾을 수 없습니다.');
      }
      
      console.log('PDF 파일 유효성 검증 완료 - PDF 시그니처:', pdfHeader);
      
      // ID를 파일명 기반으로 생성하여 일치시킴
      const timestamp = Date.now();
      const documentId = `report_${testId}_${timestamp}`;
      
      console.log('PDF 문서 정보 생성 완료:', {
        id: documentId,
        filename: pdfFilename,
        filepath: pdfFilepath,
        size: stats.size
      });
      
      return {
        id: documentId,
        testId,
        type: 'pdf',
        filename: pdfFilename,
        filepath: pdfFilepath,
        size: stats.size,
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('PDF 리포트 생성 실패:', error);
      
      // Puppeteer 관련 에러인 경우 특별한 메시지 제공
      if (error.message.includes('Puppeteer') || error.message.includes('Cannot find module')) {
        throw new Error('PDF 생성을 위해 Puppeteer가 필요합니다. 백엔드에서 "npm install puppeteer"를 실행해주세요.');
      }
      
      // 파일 생성 실패 관련 에러
      if (error.message.includes('파일이 생성되지 않았습니다') || error.message.includes('너무 작습니다')) {
        throw new Error(`PDF 생성 실패: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * 문서 목록 조회
   */
  async getDocuments(testId?: string, type?: 'html' | 'pdf'): Promise<DocumentInfo[]> {
    try {
      console.log('문서 목록 조회 시작 - testId:', testId, 'type:', type);
      const documents: DocumentInfo[] = [];
      
      // HTML 문서 목록
      const htmlDir = path.join(this.reportsDir, 'html');
      console.log('HTML 디렉토리 경로:', htmlDir);
      if (await fs.pathExists(htmlDir)) {
        const htmlFiles = await fs.readdir(htmlDir);
        console.log('HTML 파일 목록:', htmlFiles);
        for (const file of htmlFiles) {
          if (file.endsWith('.html')) {
            const filepath = path.join(htmlDir, file);
            const stats = await fs.stat(filepath);
            
            // 파일명에서 testId와 timestamp 추출 개선
            const filenameMatch = file.match(/report_(.+?)_(\d+)\.html$/);
            if (filenameMatch && filenameMatch[1] && filenameMatch[2]) {
              const extractedTestId = filenameMatch[1];
              const timestamp = filenameMatch[2];
              
              console.log('파일명:', file, '추출된 testId:', extractedTestId, '추출된 timestamp:', timestamp);
              
              // testId 필터링 로직 개선
              let shouldInclude = true;
              if (testId) {
                // 정확한 매칭 또는 부분 매칭 허용
                shouldInclude = extractedTestId === testId || 
                               extractedTestId.includes(testId) || 
                               testId.includes(extractedTestId);
              }
              
              if (shouldInclude) {
                const documentId = `report_${extractedTestId}_${timestamp}`;
                console.log('생성된 documentId:', documentId, '포함 여부:', shouldInclude);
                documents.push({
                  id: documentId,
                  testId: extractedTestId,
                  type: 'html',
                  filename: file,
                  filepath,
                  size: stats.size,
                  createdAt: stats.birthtime.toISOString()
                });
              }
            }
          }
        }
      } else {
        console.log('HTML 디렉토리가 존재하지 않음:', htmlDir);
      }
      
      // PDF 문서 목록
      const pdfDir = path.join(this.reportsDir, 'pdf');
      console.log('PDF 디렉토리 경로:', pdfDir);
      if (await fs.pathExists(pdfDir)) {
        const pdfFiles = await fs.readdir(pdfDir);
        console.log('PDF 파일 목록:', pdfFiles);
        for (const file of pdfFiles) {
          if (file.endsWith('.pdf')) {
            const filepath = path.join(pdfDir, file);
            const stats = await fs.stat(filepath);
            
            // 파일명에서 testId와 timestamp 추출 개선
            const filenameMatch = file.match(/report_(.+?)_(\d+)\.pdf$/);
            if (filenameMatch && filenameMatch[1] && filenameMatch[2]) {
              const extractedTestId = filenameMatch[1];
              const timestamp = filenameMatch[2];
              
              console.log('파일명:', file, '추출된 testId:', extractedTestId, '추출된 timestamp:', timestamp);
              
              // testId 필터링 로직 개선
              let shouldInclude = true;
              if (testId) {
                // 정확한 매칭 또는 부분 매칭 허용
                shouldInclude = extractedTestId === testId || 
                               extractedTestId.includes(testId) || 
                               testId.includes(extractedTestId);
              }
              
              if (shouldInclude) {
                const documentId = `report_${extractedTestId}_${timestamp}`;
                console.log('생성된 documentId:', documentId, '포함 여부:', shouldInclude);
                documents.push({
                  id: documentId,
                  testId: extractedTestId,
                  type: 'pdf',
                  filename: file,
                  filepath,
                  size: stats.size,
                  createdAt: stats.birthtime.toISOString()
                });
              }
            }
          }
        }
      } else {
        console.log('PDF 디렉토리가 존재하지 않음:', pdfDir);
      }
      
      console.log('최종 문서 목록:', documents.map(doc => ({ id: doc.id, filename: doc.filename, testId: doc.testId })));
      
      // 타입 필터링
      if (type) {
        const filtered = documents.filter(doc => doc.type === type);
        console.log('타입 필터링 후:', filtered.map(doc => ({ id: doc.id, filename: doc.filename })));
        return filtered;
      }
      
      // 생성일 기준 정렬 (최신순)
      const sorted = documents.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      console.log('정렬 후 문서 목록:', sorted.map(doc => ({ id: doc.id, filename: doc.filename })));
      return sorted;
    } catch (error) {
      console.error('문서 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 문서 삭제
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const documents = await this.getDocuments();
      const document = documents.find(doc => doc.id === documentId);
      
      if (!document) {
        throw new Error('문서를 찾을 수 없습니다.');
      }
      
      await fs.remove(document.filepath);
    } catch (error) {
      console.error('문서 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 문서 다운로드 URL 생성
   */
  async getDocumentUrl(documentId: string): Promise<string> {
    try {
      console.log('문서 URL 생성 요청 - documentId:', documentId);
      const documents = await this.getDocuments();
      console.log('사용 가능한 문서들:', documents.map(doc => ({ id: doc.id, filename: doc.filename })));
      
      const document = documents.find(doc => doc.id === documentId);
      
      if (!document) {
        console.error('문서를 찾을 수 없음 - documentId:', documentId);
        throw new Error('문서를 찾을 수 없습니다.');
      }
      
      console.log('찾은 문서:', document);
      // 실제 구현에서는 정적 파일 서빙을 위한 URL을 반환
      return `/api/documents/${documentId}/download`;
    } catch (error) {
      console.error('문서 URL 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 파일명으로 문서 찾기
   */
  async findDocumentByFilename(filename: string): Promise<DocumentInfo | null> {
    try {
      console.log('파일명으로 문서 찾기 - filename:', filename);
      
      // HTML 파일 확인
      const htmlPath = path.join(this.reportsDir, 'html', filename);
      if (await fs.pathExists(htmlPath)) {
        const stats = await fs.stat(htmlPath);
        const testIdFromFilename = filename.match(/report_(.+?)_/)?.[1];
        const timestampFromFilename = filename.match(/_(\d+)\.html$/)?.[1];
        
        if (testIdFromFilename && timestampFromFilename) {
          const documentId = `report_${testIdFromFilename}_${timestampFromFilename}`;
          console.log('HTML 문서 찾음 - documentId:', documentId);
          return {
            id: documentId,
            testId: testIdFromFilename,
            type: 'html',
            filename,
            filepath: htmlPath,
            size: stats.size,
            createdAt: stats.birthtime.toISOString()
          };
        }
      }
      
      // PDF 파일 확인
      const pdfPath = path.join(this.reportsDir, 'pdf', filename);
      if (await fs.pathExists(pdfPath)) {
        const stats = await fs.stat(pdfPath);
        const testIdFromFilename = filename.match(/report_(.+?)_/)?.[1];
        const timestampFromFilename = filename.match(/_(\d+)\.pdf$/)?.[1];
        
        if (testIdFromFilename && timestampFromFilename) {
          const documentId = `report_${testIdFromFilename}_${timestampFromFilename}`;
          console.log('PDF 문서 찾음 - documentId:', documentId);
          return {
            id: documentId,
            testId: testIdFromFilename,
            type: 'pdf',
            filename,
            filepath: pdfPath,
            size: stats.size,
            createdAt: stats.birthtime.toISOString()
          };
        }
      }
      
      console.log('문서를 찾을 수 없음 - filename:', filename);
      return null;
    } catch (error) {
      console.error('파일명으로 문서 찾기 실패:', error);
      return null;
    }
  }
} 