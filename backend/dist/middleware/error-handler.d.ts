import { Request, Response, NextFunction } from 'express';
import { ErrorType } from '../types';
export declare class CustomError extends Error {
    type: ErrorType;
    statusCode: number;
    constructor(type: ErrorType, message: string, statusCode?: number);
}
export declare const errorHandler: (error: Error | CustomError, _req: Request, res: Response, _next: NextFunction) => void;
export declare const createNotFoundError: (resource: string) => CustomError;
export declare const createValidationError: (message: string) => CustomError;
//# sourceMappingURL=error-handler.d.ts.map