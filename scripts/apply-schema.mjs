import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { getDatabaseConfig } from "../lib/database-config.mjs";

const schema = await readFile(new URL("../init.sql", import.meta.url), "utf8");
const pool = new Pool(getDatabaseConfig());

try {
  await pool.query(schema);
  console.log("Database schema applied successfully.");
} catch (error) {
  console.error("Failed to apply database schema.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
