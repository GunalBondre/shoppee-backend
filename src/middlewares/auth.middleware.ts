import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiErrors";
import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
}

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const headers = req.headers.authorization;

  if (!headers || !headers.startsWith("Bearer")) {
    throw new ApiError(401, "missing access token");
  }

  const token = headers.split(" ")[1];
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET!
    ) as JwtPayload;

    (req as any).user = { id: payload.userId };

    next();
  } catch {
    throw new ApiError(401, "invalid or expired token");
  }
};
