import express from "express";
import helmet from "helmet";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.middleware";
import cookieParser from "cookie-parser";
import userRoutes from "./modules/users/user.routes";
import authRoutes from "./modules/auth/auth.routes";
import orderRoutes from "./modules/orders/order.routes";

import morgan from "morgan";

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

const app = express();

// Security Headers - Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Adjust based on your needs
  })
);

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : process.env.NODE_ENV === "production"
    ? false // Deny all in production if not configured
    : "http://localhost:3000", // Default for development
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Parse JSON bodies
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", userRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1", orderRoutes);

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     description: Returns the health status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 */
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Global error handler (ALWAYS last)
app.use(errorMiddleware);

export default app;
