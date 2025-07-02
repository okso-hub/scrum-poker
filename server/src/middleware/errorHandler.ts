import { Request, Response, NextFunction } from "express";
import { AppError } from "../types/index.js";

/**
 * Global error handling middleware
 */
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
  console.error("Error:", error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  // Unknown error
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
}

/**
 * Async route wrapper to catch errors
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
