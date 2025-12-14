import { pool } from "../../db";
import { ApiError } from "../../utils/apiErrors";

export const getUser = async () => {
  const result = await pool.query(
    "SELECT id, email, account_status FROM users"
  );
  return result.rows;
};

export const getMe = async (userId: string) => {
  const user = pool.query(
    `
    SELECT id, email, phone_number, account_status, created_at
    FROM users
    WHERE id = $1    `,
    [userId]
  );

  if (!(await user).rowCount) {
    throw new ApiError(404, "User not found");
  }

  return (await user).rows[0];
};
