import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A record with that value already exists.',
      });
    }
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
      });
    }
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'An internal server error occurred.',
  });
};
