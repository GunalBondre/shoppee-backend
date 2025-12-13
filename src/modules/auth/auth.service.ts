import { randomUUID } from "crypto";
import { pool } from "../../db";
import { ApiError } from "../../utils/apiErrors";
import { hashPassword } from "../../utils/password";

export const registerUser = async (
  email: string,
  password: string,
  phone?: string
) => {
  const userExist = pool.query(`SELECT id from users WHERE email = $1`, [
    email,
  ]);

  if ((await userExist).rowCount) {
    throw new ApiError(409, "user already exists");
  }

  const hashPasssword = await hashPassword(password);

  const userId = randomUUID();

  await pool.query(
    `INSERT into users (id,email,phone_number,password_hash) values ($1,$2,$3,$4)`,
    [userId, email, phone ?? null, hashPasssword]
  );

  return { id: userId, email };
};
