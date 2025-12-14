import express from "express";
import helmet from "helmet";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.middleware";
import cookieParser from "cookie-parser";
import userRoutes from "./modules/users/user.routes";
import authRoutes from "./modules/auth/auth.routes";
import morgan from "morgan";

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

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Global error handler (ALWAYS last)
app.use(errorMiddleware);

export default app;
