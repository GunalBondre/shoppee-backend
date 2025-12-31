import { Router } from "express";
import { getMe, getUser } from "./user..service";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   email:
 *                     type: string
 *                     format: email
 *                   account_status:
 *                     type: string
 *                     enum: [active, inactive, suspended]
 *       401:
 *         description: Unauthorized
 */
router.get("/users", requireAuth, async (_req, res) => {
  const users = await getUser();
  res.json(users);
});

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   email:
 *                     type: string
 *                     format: email
 *                   account_status:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get(
  "/admin/users",
  requireAuth,
  requireRole("admin"),
  async (_req, res) => {
    const users = await getUser();
    res.json(users);
  }
);

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
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
 *                 phone_number:
 *                   type: string
 *                 account_status:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/users/me", requireAuth, async (req, res) => {
  const userId = (req as any).user.id;
  const user = await getMe(userId);
  res.json(user);
});
export default router;
