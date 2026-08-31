import { Pool } from "pg";
import { getDatabaseConfig } from "./database-config.mjs";

const pool = new Pool(getDatabaseConfig());

export default pool;
