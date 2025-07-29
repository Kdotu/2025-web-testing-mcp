"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidationError = exports.createNotFoundError = exports.errorHandler = exports.CustomError = void 0;
const types_1 = require("../types");
class CustomError extends Error {
    constructor(type, message, statusCode = 500) {
        super(message);
        this.type = type;
        this.statusCode = statusCode;
    }
}
exports.CustomError = CustomError;
const errorHandler = (error, _req, res, _next) => {
    console.error('Error occurred:', error);
    let statusCode = 500;
    let errorType = types_1.ErrorType.INTERNAL_ERROR;
    let message = 'Internal server error';
    if (error instanceof CustomError) {
        statusCode = error.statusCode;
        errorType = error.type;
        message = error.message;
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        errorType = types_1.ErrorType.VALIDATION_ERROR;
        message = error.message;
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        errorType = types_1.ErrorType.VALIDATION_ERROR;
        message = 'Invalid data format';
    }
    const errorResponse = {
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
exports.errorHandler = errorHandler;
const createNotFoundError = (resource) => {
    return new CustomError(types_1.ErrorType.NOT_FOUND, `${resource} not found`, 404);
};
exports.createNotFoundError = createNotFoundError;
const createValidationError = (message) => {
    return new CustomError(types_1.ErrorType.VALIDATION_ERROR, message, 400);
};
exports.createValidationError = createValidationError;
//# sourceMappingURL=error-handler.js.map