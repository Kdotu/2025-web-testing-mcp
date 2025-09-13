import { Request, Response, NextFunction } from 'express';
export declare class TestTypeController {
    private testTypeService;
    constructor();
    getAllTestTypes(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getEnabledTestTypes(_req: Request, res: Response, next: NextFunction): Promise<void>;
    addTestType(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateTestType(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteTestType(req: Request, res: Response, next: NextFunction): Promise<void>;
    toggleTestType(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=test-type-controller.d.ts.map