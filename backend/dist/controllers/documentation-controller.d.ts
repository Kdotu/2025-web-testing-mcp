import { Request, Response, NextFunction } from 'express';
export declare class DocumentationController {
    private documentationService;
    constructor();
    generateHtmlReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    generatePdfReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getDocuments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteDocument: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    downloadDocument: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    previewDocument: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getDocumentStats: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=documentation-controller.d.ts.map