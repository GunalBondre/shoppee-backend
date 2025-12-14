import { Router } from "express";
import { getMe, getUser } from "./user..service";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

router.get("/users", requireAuth, async (_req, res) => {
  const users = await getUser();
  res.json(users);
});

router.get(
  "/admin/users",
  requireAuth,
  requireRole("admin"),
  async (_req, res) => {
    const users = await getUser();
    res.json(users);
  }
);

router.get("/users/me", requireAuth, async (req, res) => {
  const userId = (req as any).user.id;
  const user = await getMe(userId);
  res.json(user);
});
export default router;
