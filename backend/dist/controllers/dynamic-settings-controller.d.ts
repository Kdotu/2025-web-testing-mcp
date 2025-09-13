import { Request, Response } from 'express';
export declare class DynamicSettingsController {
    private dynamicSettingsService;
    constructor();
    generateSettingsForm: (req: Request, res: Response) => Promise<void>;
    validateField: (req: Request, res: Response) => Promise<void>;
    saveSettings: (req: Request, res: Response) => Promise<void>;
    loadSettings: (req: Request, res: Response) => Promise<void>;
    validateSettings: (req: Request, res: Response) => Promise<void>;
    convertToTestConfig: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=dynamic-settings-controller.d.ts.map