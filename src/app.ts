import express from "express";
import { errorMiddleware } from "./middlewares/error.middleware";
import { ApiError } from "./utils/apiErrors";
import userRoutes from "./modules/users/user.routes";
import authRoutes from "./modules/auth/auth.routes";

const app = express();

// Parse JSON bodies
app.use(express.json());
app.use("/api/v1", userRoutes);
app.use("/api/v1", authRoutes);

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Global error handler (ALWAYS last)
app.use(errorMiddleware);

export default app;
