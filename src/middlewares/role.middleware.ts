import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiErrors";
import { pool } from "../db";

export const requireRole =
  (roleName: string) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthenticated");
    }

    const result = await pool.query(
      `
        SELECT 1
        FROM user_roles ur
        JOIN roles ON r.id = ur.role_id
        WHERE ur.user_id = $1 AND r.name = $2

        `,
      [userId, roleName]
    );

    if (!result.rowCount) {
      throw new ApiError(403, "Forbidden");
    }

    next();
  };
