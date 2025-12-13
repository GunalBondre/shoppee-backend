import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { regiserSchema } from "./auth.schema";
import { registerUser } from "./auth.service";

const router = Router();

router.post("/users/register", validate(regiserSchema), async (req, res) => {
  const { email, password, phone_number } = req.body;
  console.log(req.body);
  const user = await registerUser(email, password, phone_number);

  res.status(201).json(user);
});

export default router;
