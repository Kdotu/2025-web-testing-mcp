import { Request, Response, NextFunction } from 'express';
export declare class TestMetricController {
    private testMetricService;
    constructor();
    getMetricsByTestId: (req: Request, res: Response, _next: NextFunction) => Promise<void>;
    getGroupedMetricsByTestId: (req: Request, res: Response, _next: NextFunction) => Promise<void>;
    getMetricsByTestIdAndType: (req: Request, res: Response, _next: NextFunction) => Promise<void>;
    getMetricByTestIdTypeAndName: (req: Request, res: Response, _next: NextFunction) => Promise<void>;
    getMetricStatsByTestIdTypeAndName: (req: Request, res: Response, _next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=test-metric-controller.d.ts.map