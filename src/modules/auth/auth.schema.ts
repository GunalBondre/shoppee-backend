import { z } from "zod";

export const regiserSchema = {
  body: z.object({
    email: z.email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phone_number: z.string().optional(),
  }),
};

export const loginSchema = {
  body: z.object({
      email: z.email(),
      password: z.string(),
  }),
};
