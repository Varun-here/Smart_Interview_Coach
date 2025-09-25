// apps/api/src/lib/db.ts
import dotenv from "dotenv";
dotenv.config(); // <-- ensure env is loaded before creating the pool

import { Pool } from "pg";

const url = process.env.DATABASE_URL;

if (!url || typeof url !== "string" || !/^postgres/i.test(url)) {
  throw new Error(
    "Invalid or missing DATABASE_URL. Set it in apps/api/.env, e.g.\n" +
    "DATABASE_URL=postgresql://app:appstrongpw@localhost:5432/sic"
  );
}

export const pool = new Pool({ connectionString: url });

export const query = (text: string, params?: any[]) => pool.query(text, params);
