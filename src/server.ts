// Load environment variables FIRST, before any other imports
import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { startTokenCleanupJob } from "./utils/tokenCleanup";

const PORT = process.env.PORT || 3000;

// Start token cleanup job (runs every hour by default)
// Can be configured via TOKEN_CLEANUP_INTERVAL_MINUTES env var
const cleanupIntervalMinutes = process.env.TOKEN_CLEANUP_INTERVAL_MINUTES
  ? parseInt(process.env.TOKEN_CLEANUP_INTERVAL_MINUTES, 10)
  : 60;

const cleanupJob = startTokenCleanupJob(cleanupIntervalMinutes);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  cleanupJob && clearInterval(cleanupJob);
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  cleanupJob && clearInterval(cleanupJob);
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
});
