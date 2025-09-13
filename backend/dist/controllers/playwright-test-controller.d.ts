import { Request, Response } from 'express';
export declare class PlaywrightTestController {
    private playwrightService;
    constructor();
    executeTestScenario(req: Request, res: Response): Promise<void>;
    getTestExecutionStatus(req: Request, res: Response): Promise<void>;
    getTestExecutionResult(req: Request, res: Response): Promise<void>;
    validateTestScenario(req: Request, res: Response): Promise<void>;
    private validatePlaywrightCode;
    checkMCPStatus(_req: Request, res: Response): Promise<void>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=playwright-test-controller.d.ts.map