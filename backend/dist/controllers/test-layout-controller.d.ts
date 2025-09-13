import { Request, Response } from 'express';
export declare class TestLayoutController {
    private testLayoutService;
    constructor();
    getAllLayouts(_req: Request, res: Response): Promise<void>;
    getLayoutsByTestType(req: Request, res: Response): Promise<void>;
    getLayoutById(req: Request, res: Response): Promise<void>;
    createLayout(req: Request, res: Response): Promise<void>;
    updateLayout(req: Request, res: Response): Promise<void>;
    deleteLayout(req: Request, res: Response): Promise<void>;
    createSection(req: Request, res: Response): Promise<void>;
    createField(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=test-layout-controller.d.ts.map