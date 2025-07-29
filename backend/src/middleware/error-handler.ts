import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType } from '../types';

/**
 * 커스텀 에러 클래스
 */
export class CustomError extends Error {
  public type: ErrorType;
  public statusCode: number;

  constructor(type: ErrorType, message: string, statusCode: number = 500) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
  }
}

/**
 * 에러 핸들러 미들웨어
 */
export const errorHandler = (
  error: Error | CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error occurred:', error);

  let statusCode = 500;
  let errorType = ErrorType.INTERNAL_ERROR;
  let message = 'Internal server error';

  if (error instanceof CustomError) {
    statusCode = error.statusCode;
    errorType = error.type;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorType = ErrorType.VALIDATION_ERROR;
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorType = ErrorType.VALIDATION_ERROR;
    message = 'Invalid data format';
  }

  const errorResponse: AppError = {
    type: errorType,
    message,
    timestamp: new Date().toISOString(),
    details: process.env['NODE_ENV'] === 'development' ? error.stack : undefined
  };

  res.status(statusCode).json({
    success: false,
    error: errorResponse,
    timestamp: new Date().toISOString()
  });
};

/**
 * 404 에러 생성 헬퍼
 */
export const createNotFoundError = (resource: string) => {
  return new CustomError(
    ErrorType.NOT_FOUND,
    `${resource} not found`,
    404
  );
};

/**
 * 검증 에러 생성 헬퍼
 */
export const createValidationError = (message: string) => {
  return new CustomError(
    ErrorType.VALIDATION_ERROR,
    message,
    400
  );
}; 