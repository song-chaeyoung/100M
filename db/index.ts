import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import * as dotenv from "dotenv";

// .env.local 파일 로드
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
