import { Request, Response, NextFunction } from 'express';
import { LoadTestConfig, LoadTestResult } from '../types';
export declare class TestManageController {
    private e2eTestService;
    private lighthouseService;
    private k6Service;
    private testResultService;
    private testManageService;
    constructor();
    executeE2ETest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    runLighthouseTest(req: Request, res: Response): Promise<void>;
    createLoadTest(config: LoadTestConfig): Promise<LoadTestResult>;
    executeK6MCPTestDirect(params: {
        url: string;
        name: string;
        description?: string;
        script: string;
        config: {
            duration: string;
            vus: number;
            detailedConfig?: any;
        };
    }): Promise<LoadTestResult>;
    executeK6MCPTest(params: {
        url: string;
        name: string;
        description?: string;
        script: string;
        config: {
            duration: string;
            vus: number;
            detailedConfig?: any;
        };
    }): Promise<LoadTestResult>;
    getTestStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    cancelTest(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateTestStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    private executeK6MCPTestAsync;
    private executeK6MCPTestDirectAsync;
}
//# sourceMappingURL=test-manage-controller.d.ts.map