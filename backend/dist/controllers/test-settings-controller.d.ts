import { Request, Response } from 'express';
export declare class TestSettingsController {
    private testSettingsService;
    constructor();
    getAllSettings(_req: Request, res: Response): Promise<void>;
    getSettingById(req: Request, res: Response): Promise<void>;
    createSetting(req: Request, res: Response): Promise<void>;
    updateSetting(req: Request, res: Response): Promise<void>;
    deleteSetting(req: Request, res: Response): Promise<void>;
    getSettingsByCategory(req: Request, res: Response): Promise<void>;
    searchSettings(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=test-settings-controller.d.ts.map