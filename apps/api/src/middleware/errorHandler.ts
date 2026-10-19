import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Structured logging
  const timestamp = new Date().toISOString();
  if (process.env.NODE_ENV !== 'test' || !(err instanceof AppError)) {
    console.error(`[${timestamp}] [ERROR] ${err.name || 'Error'}: ${err.message}`);
  }

  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'One or more request parameters failed validation.',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // 2. Custom Application Error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      details: err.details,
    });
    return;
  }

  // 3. Prisma Known Request Errors
  if (err.code === 'P2002') {
    res.status(409).json({
      error: 'Conflict',
      message: `A record with this ${err.meta?.target ? err.meta.target : 'unique value'} already exists.`,
    });
    return;
  }

  if (err.code === 'P2025') {
    res.status(404).json({
      error: 'Not Found',
      message: 'Requested record was not found.',
    });
    return;
  }

  // 4. Default 500 Server Error (without leaking stack traces)
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message = statusCode < 500 ? err.message : 'An unexpected server error occurred.';

  res.status(statusCode).json({
    error: statusCode === 404 ? 'Not Found' : statusCode === 403 ? 'Forbidden' : 'Internal Server Error',
    message,
  });
}
