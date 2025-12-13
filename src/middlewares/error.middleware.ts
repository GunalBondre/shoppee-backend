import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiErrors";

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }
  console.error(err);

  res.status(500).json({
    message: "Internal Server Error",
  });
};
