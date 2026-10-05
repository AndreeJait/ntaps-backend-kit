import mysql, { type Pool } from "mysql2/promise";
import type { ShutdownManager } from "../../core/lifecycle/shutdown-manager.js";

export async function connectMysql(url: string, lifecycle: ShutdownManager): Promise<Pool> {
  const pool = mysql.createPool(url);
  const connection = await pool.getConnection();
  connection.release();
  lifecycle.register({ name: "mysql", phase: "connections", close: () => pool.end() });
  return pool;
}
