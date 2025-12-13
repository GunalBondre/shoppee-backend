import { ZodType, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiErrors";

type ValidationSchema = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export const validate =
  (schema: ValidationSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
          throw new ApiError(400, "Request body is required and must be a JSON object");
        }
        schema.body.parse(req.body);
      }
      if (schema.params) {
        schema.params.parse(req.params);
      }
      if (schema.query) {
        schema.query.parse(req.query);
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errorMessage = err.issues.map((issue) => {
          const path = issue.path.join('.');
          return path ? `${path}: ${issue.message}` : issue.message;
        }).join(", ");
        throw new ApiError(400, errorMessage || "Invalid request");
      }
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(400, "Invalid request");
    }
  };
