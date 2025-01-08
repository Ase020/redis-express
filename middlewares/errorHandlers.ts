import type { NextFunction, Request, Response } from "express";
import { errorResponse } from "../utils/responses.js";

// export function errorHandler(
//   error: Error | any,
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) {
//   console.error(error);
//   errorResponse(res, 500, error as string);
// }

export function errorHandler(
  err: Error | any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Prevent headers already sent errors
  if (res.headersSent) {
    return next(err);
  }

  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    code: err.code,
  });

  // Handle different types of errors
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  errorResponse(res, statusCode, message);
}
