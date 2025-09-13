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
export declare class DocumentationService {
    private testResultService;
    private testMetricService;
    private reportsDir;
    private templatesDir;
    constructor();
    private resolveReportsDirectory;
    private resolveTemplatesDirectory;
    private ensureDirectories;
    private checkDirectoryPermissions;
    private registerHandlebarsHelpers;
    generateHtmlReport(testId: string): Promise<DocumentInfo>;
    private generateHtmlTemplate;
    generatePdfReport(testId: string): Promise<DocumentInfo>;
    getDocuments(testId?: string, type?: 'html' | 'pdf'): Promise<DocumentInfo[]>;
    deleteDocument(documentId: string): Promise<void>;
    getDocumentUrl(documentId: string): Promise<string>;
    findDocumentByFilename(filename: string): Promise<DocumentInfo | null>;
}
export {};
//# sourceMappingURL=documentation-service.d.ts.map