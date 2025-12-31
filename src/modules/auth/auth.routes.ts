import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { loginSchema, regiserSchema } from "./auth.schema";
import { loginUser, refreshAccessToken, registerUser } from "./auth.service";
import { ApiError } from "../../utils/apiErrors";
import { pool } from "../../db";

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: password123
 *               phone_number:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                   format: email
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post("/auth/register", validate(regiserSchema), async (req, res) => {
  const { email, password, phone_number } = req.body;
  const user = await registerUser(email, password, phone_number);

  res.status(201).json(user);
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: Refresh token stored in HTTP-only cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token (valid for 15 minutes)
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account not active
 */
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

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     description: Uses refresh token from HTTP-only cookie to get a new access token
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: New JWT access token (valid for 15 minutes)
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/auth/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    throw new ApiError(401, "No refresh token");
  }

  const accessToken = await refreshAccessToken(token);

  res.json({ accessToken });
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     description: Revokes refresh token and clears cookie
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged Out"
 */
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
