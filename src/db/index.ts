import { Pool } from "pg";

// Validate required environment variables
const requiredEnvVars = ["DB_HOST", "DB_NAME", "DB_USER"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(
    `❌ Missing required environment variables: ${missingVars.join(", ")}`
  );
  console.error("Please check your .env file");
}

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "", // Ensure it's always a string
  max: 1000, // max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
