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
exports.DocumentationService = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const Handlebars = __importStar(require("handlebars"));
const test_result_service_1 = require("./test-result-service");
const test_metric_service_1 = require("./test-metric-service");
class DocumentationService {
    constructor() {
        this.testResultService = new test_result_service_1.TestResultService();
        this.testMetricService = new test_metric_service_1.TestMetricService();
        this.reportsDir = this.resolveReportsDirectory();
        this.templatesDir = this.resolveTemplatesDirectory();
        this.ensureDirectories();
        this.registerHandlebarsHelpers();
    }
    resolveReportsDirectory() {
        const possiblePaths = [
            path.join(process.cwd(), 'reports'),
            path.join(__dirname, '../../reports'),
            path.resolve(process.cwd(), 'backend', 'reports'),
            process.env['REPORTS_DIR'] || '',
            path.join(process.env['HOME'] || process.env['USERPROFILE'] || '', '.web-testing-mcp', 'reports')
        ];
        for (const dirPath of possiblePaths) {
            if (dirPath && dirPath !== '') {
                try {
                    if (fs.existsSync(dirPath)) {
                        console.log(`Using existing reports directory: ${dirPath}`);
                        return dirPath;
                    }
                }
                catch (error) {
                    console.log(`Path check failed for: ${dirPath}`, error.message);
                }
            }
        }
        const defaultPath = path.join(process.cwd(), 'reports');
        console.log(`Using default reports directory: ${defaultPath}`);
        return defaultPath;
    }
    resolveTemplatesDirectory() {
        const possiblePaths = [
            path.join(process.cwd(), 'templates'),
            path.join(__dirname, '../../templates'),
            path.resolve(process.cwd(), 'backend', 'templates'),
            process.env['TEMPLATES_DIR'] || '',
            path.join(process.env['HOME'] || process.env['USERPROFILE'] || '', '.web-testing-mcp', 'templates')
        ];
        for (const dirPath of possiblePaths) {
            if (dirPath && dirPath !== '') {
                try {
                    if (fs.existsSync(dirPath)) {
                        console.log(`Using existing templates directory: ${dirPath}`);
                        return dirPath;
                    }
                }
                catch (error) {
                    console.log(`Path check failed for: ${dirPath}`, error.message);
                }
            }
        }
        const defaultPath = path.join(process.cwd(), 'templates');
        console.log(`Using default templates directory: ${defaultPath}`);
        return defaultPath;
    }
    ensureDirectories() {
        try {
            fs.ensureDirSync(this.reportsDir);
            fs.ensureDirSync(this.templatesDir);
            const htmlDir = path.join(this.reportsDir, 'html');
            const pdfDir = path.join(this.reportsDir, 'pdf');
            fs.ensureDirSync(htmlDir);
            fs.ensureDirSync(pdfDir);
            console.log(`Reports directory structure created successfully:`);
            console.log(`  - Main: ${this.reportsDir}`);
            console.log(`  - HTML: ${htmlDir}`);
            console.log(`  - PDF: ${pdfDir}`);
            console.log(`  - Templates: ${this.templatesDir}`);
            this.checkDirectoryPermissions();
        }
        catch (error) {
            console.error('Failed to create reports directory structure:', error);
            throw new Error(`Reports directory creation failed: ${error.message}`);
        }
    }
    checkDirectoryPermissions() {
        try {
            fs.accessSync(this.reportsDir, fs.constants.R_OK);
            fs.accessSync(this.reportsDir, fs.constants.W_OK);
            const htmlDir = path.join(this.reportsDir, 'html');
            const pdfDir = path.join(this.reportsDir, 'pdf');
            fs.accessSync(htmlDir, fs.constants.R_OK | fs.constants.W_OK);
            fs.accessSync(pdfDir, fs.constants.R_OK | fs.constants.W_OK);
            console.log('Directory permissions verified successfully');
        }
        catch (error) {
            console.warn('Directory permission warning:', error.message);
            console.log('Attempting to fix permissions...');
            try {
                if (process.platform !== 'win32') {
                    const { execSync } = require('child_process');
                    execSync(`chmod -R 755 "${this.reportsDir}"`);
                    console.log('Directory permissions updated');
                }
            }
            catch (permError) {
                console.warn('Permission fix failed:', permError.message);
            }
        }
    }
    registerHandlebarsHelpers() {
        Handlebars.registerHelper('formatDate', function (date) {
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
        Handlebars.registerHelper('formatDuration', function (seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            if (hours > 0) {
                return `${hours}시간 ${minutes}분 ${secs}초`;
            }
            else if (minutes > 0) {
                return `${minutes}분 ${secs}초`;
            }
            else {
                return `${secs}초`;
            }
        });
        Handlebars.registerHelper('formatMetricValue', function (value, unit) {
            if (unit === 'ms') {
                return `${value.toFixed(2)}ms`;
            }
            else if (unit === 'req/s') {
                return `${value.toFixed(2)} req/s`;
            }
            else if (unit === '%') {
                return `${value.toFixed(2)}%`;
            }
            else {
                return `${value} ${unit}`;
            }
        });
        Handlebars.registerHelper('getStatusColor', function (status) {
            switch (status) {
                case 'completed': return 'success';
                case 'failed': return 'danger';
                case 'running': return 'warning';
                case 'cancelled': return 'secondary';
                default: return 'info';
            }
        });
        Handlebars.registerHelper('getStatusText', function (status) {
            switch (status) {
                case 'completed': return '완료';
                case 'failed': return '실패';
                case 'running': return '실행 중';
                case 'cancelled': return '취소';
                default: return '알 수 없음';
            }
        });
    }
    async generateHtmlReport(testId) {
        try {
            console.log('HTML 리포트 생성 시작 - testId:', testId);
            let testResult = await this.testResultService.getResultById(testId);
            if (!testResult) {
                testResult = await this.testResultService.getResultByTestId(testId);
            }
            if (!testResult) {
                throw new Error('테스트 결과를 찾을 수 없습니다.');
            }
            console.log('테스트 결과 찾음:', testResult.id);
            const metrics = await this.testMetricService.getMetricsByTestId(testId);
            console.log('메트릭 수:', metrics.length);
            const testType = {
                name: testResult.testType || 'Unknown',
                description: 'Test type from result'
            };
            const reportData = {
                testResult,
                metrics,
                testType,
                generatedAt: new Date().toISOString(),
                reportId: `report_${testId}_${Date.now()}`
            };
            const htmlContent = await this.generateHtmlTemplate(reportData);
            const timestamp = Date.now();
            const filename = `report_${testId}_${timestamp}.html`;
            const filepath = path.join(this.reportsDir, 'html', filename);
            console.log('HTML 파일 저장 - filepath:', filepath);
            await fs.writeFile(filepath, htmlContent, 'utf8');
            const stats = await fs.stat(filepath);
            const documentId = `report_${testId}_${timestamp}`;
            const result = {
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
        }
        catch (error) {
            console.error('HTML 리포트 생성 실패:', error);
            throw error;
        }
    }
    async generateHtmlTemplate(data) {
        try {
            const templatePath = path.join(this.templatesDir, 'report-template.hbs');
            if (!await fs.pathExists(templatePath)) {
                console.error('템플릿 파일이 존재하지 않음:', templatePath);
                throw new Error('템플릿 파일을 찾을 수 없습니다.');
            }
            const template = await fs.readFile(templatePath, 'utf8');
            console.log('템플릿 파일 로드 완료:', templatePath);
            const compiledTemplate = Handlebars.compile(template);
            const htmlContent = compiledTemplate(data);
            console.log('HTML 템플릿 렌더링 완료');
            return htmlContent;
        }
        catch (error) {
            console.error('HTML 템플릿 생성 실패:', error);
            throw error;
        }
    }
    async generatePdfReport(testId) {
        try {
            const htmlReport = await this.generateHtmlReport(testId);
            let puppeteer;
            try {
                puppeteer = require('puppeteer');
            }
            catch (error) {
                console.error('Puppeteer 모듈을 찾을 수 없습니다:', error.message);
                throw new Error('PDF 생성을 위해 Puppeteer가 필요합니다. "npm install puppeteer"를 실행해주세요.');
            }
            const pdfFilename = htmlReport.filename.replace('.html', '.pdf');
            const pdfFilepath = path.join(this.reportsDir, 'pdf', pdfFilename);
            console.log('PDF 생성 시작 - HTML 파일:', htmlReport.filepath);
            console.log('PDF 저장 경로:', pdfFilepath);
            const htmlContent = await fs.readFile(htmlReport.filepath, 'utf8');
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
            await page.setContent(htmlContent, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.setViewport({
                width: 794,
                height: 1123,
                deviceScaleFactor: 1
            });
            console.log('PDF 생성 중...');
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
            await fs.writeFile(pdfFilepath, pdfData);
            if (!await fs.pathExists(pdfFilepath)) {
                throw new Error('PDF 파일이 생성되지 않았습니다.');
            }
            const stats = await fs.stat(pdfFilepath);
            console.log('PDF 생성 완료 - 파일 크기:', stats.size, 'bytes');
            if (stats.size < 1000) {
                throw new Error(`PDF 파일이 너무 작습니다 (${stats.size} bytes). 생성에 실패했을 수 있습니다.`);
            }
            const pdfFileBuffer = await fs.readFile(pdfFilepath);
            const pdfHeader = pdfFileBuffer.slice(0, 4).toString('ascii');
            if (pdfHeader !== '%PDF') {
                throw new Error('생성된 파일이 유효한 PDF가 아닙니다. PDF 헤더를 찾을 수 없습니다.');
            }
            console.log('PDF 파일 유효성 검증 완료 - PDF 시그니처:', pdfHeader);
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
        }
        catch (error) {
            console.error('PDF 리포트 생성 실패:', error);
            if (error.message.includes('Puppeteer') || error.message.includes('Cannot find module')) {
                throw new Error('PDF 생성을 위해 Puppeteer가 필요합니다. 백엔드에서 "npm install puppeteer"를 실행해주세요.');
            }
            if (error.message.includes('파일이 생성되지 않았습니다') || error.message.includes('너무 작습니다')) {
                throw new Error(`PDF 생성 실패: ${error.message}`);
            }
            throw error;
        }
    }
    async getDocuments(testId, type) {
        try {
            console.log('문서 목록 조회 시작 - testId:', testId, 'type:', type);
            const documents = [];
            const htmlDir = path.join(this.reportsDir, 'html');
            console.log('HTML 디렉토리 경로:', htmlDir);
            if (await fs.pathExists(htmlDir)) {
                const htmlFiles = await fs.readdir(htmlDir);
                console.log('HTML 파일 목록:', htmlFiles);
                for (const file of htmlFiles) {
                    if (file.endsWith('.html')) {
                        const filepath = path.join(htmlDir, file);
                        const stats = await fs.stat(filepath);
                        const filenameMatch = file.match(/report_(.+?)_(\d+)\.html$/);
                        if (filenameMatch && filenameMatch[1] && filenameMatch[2]) {
                            const extractedTestId = filenameMatch[1];
                            const timestamp = filenameMatch[2];
                            console.log('파일명:', file, '추출된 testId:', extractedTestId, '추출된 timestamp:', timestamp);
                            let shouldInclude = true;
                            if (testId) {
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
            }
            else {
                console.log('HTML 디렉토리가 존재하지 않음:', htmlDir);
            }
            const pdfDir = path.join(this.reportsDir, 'pdf');
            console.log('PDF 디렉토리 경로:', pdfDir);
            if (await fs.pathExists(pdfDir)) {
                const pdfFiles = await fs.readdir(pdfDir);
                console.log('PDF 파일 목록:', pdfFiles);
                for (const file of pdfFiles) {
                    if (file.endsWith('.pdf')) {
                        const filepath = path.join(pdfDir, file);
                        const stats = await fs.stat(filepath);
                        const filenameMatch = file.match(/report_(.+?)_(\d+)\.pdf$/);
                        if (filenameMatch && filenameMatch[1] && filenameMatch[2]) {
                            const extractedTestId = filenameMatch[1];
                            const timestamp = filenameMatch[2];
                            console.log('파일명:', file, '추출된 testId:', extractedTestId, '추출된 timestamp:', timestamp);
                            let shouldInclude = true;
                            if (testId) {
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
            }
            else {
                console.log('PDF 디렉토리가 존재하지 않음:', pdfDir);
            }
            console.log('최종 문서 목록:', documents.map(doc => ({ id: doc.id, filename: doc.filename, testId: doc.testId })));
            if (type) {
                const filtered = documents.filter(doc => doc.type === type);
                console.log('타입 필터링 후:', filtered.map(doc => ({ id: doc.id, filename: doc.filename })));
                return filtered;
            }
            const sorted = documents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            console.log('정렬 후 문서 목록:', sorted.map(doc => ({ id: doc.id, filename: doc.filename })));
            return sorted;
        }
        catch (error) {
            console.error('문서 목록 조회 실패:', error);
            throw error;
        }
    }
    async deleteDocument(documentId) {
        try {
            const documents = await this.getDocuments();
            const document = documents.find(doc => doc.id === documentId);
            if (!document) {
                throw new Error('문서를 찾을 수 없습니다.');
            }
            await fs.remove(document.filepath);
        }
        catch (error) {
            console.error('문서 삭제 실패:', error);
            throw error;
        }
    }
    async getDocumentUrl(documentId) {
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
            return `/api/documents/${documentId}/download`;
        }
        catch (error) {
            console.error('문서 URL 생성 실패:', error);
            throw error;
        }
    }
    async findDocumentByFilename(filename) {
        try {
            console.log('파일명으로 문서 찾기 - filename:', filename);
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
        }
        catch (error) {
            console.error('파일명으로 문서 찾기 실패:', error);
            return null;
        }
    }
}
exports.DocumentationService = DocumentationService;
//# sourceMappingURL=documentation-service.js.map