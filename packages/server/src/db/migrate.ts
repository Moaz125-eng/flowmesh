import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./client.js";
import { logger } from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  const sqlPath = join(__dirname, "schema.sql");
  const sql = await readFile(sqlPath, "utf-8");
  const client = await pool.connect();
  try {
    await client.query(sql);
    logger.info("schema applied");
  } finally {
    client.release();
  }
}
