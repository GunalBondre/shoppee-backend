import { pool } from "../../db";

export const getUser = async () => {
  const result = await pool.query("SELECT id, email, account_status FROM users");
  return result.rows;
};
