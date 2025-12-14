import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { loginSchema, regiserSchema } from "./auth.schema";
import { loginUser, refreshAccessToken, registerUser } from "./auth.service";
import { ApiError } from "../../utils/apiErrors";
import { pool } from "../../db";

const router = Router();

router.post("/auth/register", validate(regiserSchema), async (req, res) => {
  const { email, password, phone_number } = req.body;
  const user = await registerUser(email, password, phone_number);

  res.status(201).json(user);
});

router.post("/auth/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const { accessToken, refreshToken } = await loginUser(email, password);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Lax for local development
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({ accessToken });
});

router.post("/auth/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    throw new ApiError(401, "No refresh token");
  }

  const accessToken = await refreshAccessToken(token);

  res.json({ accessToken });
});

router.post("/auth/logout", async (req, res) => {
  const token = req?.cookies.refreshToken;
  if (token) {
    await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  });

  res.json({ message: "Logged Out" });
});

export default router;
