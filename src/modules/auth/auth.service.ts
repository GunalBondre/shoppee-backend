import jwt from "jsonwebtoken";

import { randomUUID } from "crypto";
import { pool } from "../../db";
import { ApiError } from "../../utils/apiErrors";
import { comparePassword, hashPassword } from "../../utils/password";
import { signAccessToken, signRefreshToken } from "../../utils/jwt";

export const registerUser = async (
  email: string,
  password: string,
  phone?: string
) => {
  const userExist = pool.query(`SELECT id from users WHERE email = $1`, [
    email,
  ]);

  if ((await userExist).rowCount) {
    throw new ApiError(409, "user already exists");
  }

  const hashPasssword = await hashPassword(password);

  const userId = randomUUID();

  await pool.query(
    `INSERT into users (id,email,phone_number,password_hash) values ($1,$2,$3,$4)`,
    [userId, email, phone ?? null, hashPasssword]
  );

  return { id: userId, email };
};

export const loginUser = async (email: string, password: string) => {
  const result = await pool.query(
    "SELECT id, email, password_hash, account_status FROM users WHERE email = $1",
    [email]
  );

  if (!result.rowCount) {
    throw new ApiError(401, "Invalid credentials");
  }

  const user = result.rows[0];

  if (user.account_status !== "active") {
    throw new ApiError(403, "Account not active");
  }

  const match = await comparePassword(password, user.password_hash);

  if (!match) {
    throw new ApiError(401, "Invalid credentials");
  }

  const payload = { userId: user.id };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await pool.query(
    `
    INSERT INTO refresh_tokens (id, user_id, token, expires_at)
    VALUES ($1, $2, $3, now() + interval '7 days')
    `,
    [randomUUID(), user.id, refreshToken]
  );

  return { accessToken, refreshToken };
};

export const refreshAccessToken = async (token: string) => {
  let payload: any;

  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const dbToken = await pool.query(
    "SELECT id FROM refresh_tokens WHERE token = $1",
    [token]
  );

  if (!dbToken.rowCount) {
    throw new ApiError(401, "Refresh token revoked");
  }

  // rotate

  await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);

  const newRefreshToken = signRefreshToken({ userId: payload.userId });

  await pool.query(
    `
    INSERT INTO refresh_tokens (id, user_id, token, expires_at)
    VALUES ($1, $2, $3, now() + interval '7 days')
    `,
    [randomUUID(), payload.userId, newRefreshToken]
  );

  return {
    accessToken: signAccessToken({ userId: payload.userId }),
    refreshToken: newRefreshToken,
  };
};
