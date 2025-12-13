import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { createUserSchema } from "./user.schema";
import { getUser } from "./user..service";

const router = Router();

router.post("/users", validate(createUserSchema), async (_req, res) => {
  const users = await getUser();
  res.json(users);
});

export default router;
