import { Request, Response, NextFunction } from "express";
import { AppError } from "../types/index.js";

export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
  console.error("Error:", error);

  // our error
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
    });
    return;
  }

  // unknown error
  res.status(500).json({
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
