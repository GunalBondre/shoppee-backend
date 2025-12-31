import { pool } from "../db";

export const cleanupExpiredTokens = async (): Promise<number> => {
  try {
    const result = await pool.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW() RETURNING id`
    );

    const deletedCount = result.rowCount || 0;

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired refresh token(s)`);
    }

    return deletedCount;
  } catch (error) {
    console.error("❌ Error cleaning up expired tokens:", error);
    throw error;
  }
};

/**
 * Starts a scheduled job to clean up expired tokens
 * @param intervalMinutes - How often to run cleanup (default: 60 minutes)
 */
export const startTokenCleanupJob = (
  intervalMinutes: number = 60
): NodeJS.Timeout => {
  // Run immediately on start
  cleanupExpiredTokens().catch((err) => {
    console.error("Initial token cleanup failed:", err);
  });

  // Then run on schedule
  const intervalMs = intervalMinutes * 60 * 1000;
  const interval = setInterval(() => {
    cleanupExpiredTokens().catch((err) => {
      console.error("Scheduled token cleanup failed:", err);
    });
  }, intervalMs);

  console.log(
    `✅ Token cleanup job started (runs every ${intervalMinutes} minutes)`
  );

  return interval;
};

/**
 * Stops the token cleanup job
 */
export const stopTokenCleanupJob = (interval: NodeJS.Timeout): void => {
  clearInterval(interval);
  console.log("🛑 Token cleanup job stopped");
};
