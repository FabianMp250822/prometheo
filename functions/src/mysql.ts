
import mysql from "mysql2/promise";
import * as functions from "firebase-functions";
import type {Pool} from "mysql2/promise";

let pool: Pool | null = null;

/**
 * Creates and returns a singleton MySQL connection pool.
 * The entire configuration is read inside this function to avoid
 * global scope errors during deployment.
 * @return {Pool} The MySQL connection pool.
 */
function getPool(): Pool {
  if (!pool) {
    // Get the mysql config object ONLY when the pool is first requested.
    const mysqlConfig = functions.config().mysql;

    // Configuration for the MySQL connection pool
    const config = {
      host: mysqlConfig?.host || "193.203.175.34", // IP from your Hostinger panel
      user: mysqlConfig?.user || "u965232645_dajusticia",
      password: mysqlConfig?.password || "D@justicia162804",
      database: mysqlConfig?.database || "u965232645_dajusticia",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
    
    pool = mysql.createPool(config);
  }
  return pool;
}

/**
 * Executes a SQL query and returns the results.
 * It automatically handles getting a connection from the pool and releasing it.
 * @param {string} sql The SQL query to execute.
 * @param {any[]} [params] The parameters to bind to the query.
 * @return {Promise<any>} A promise that resolves with the query results.
 */
export async function queryDatabase(sql: string, params?: any[]): Promise<any> {
  try {
    const connectionPool = getPool();
    const [results] = await connectionPool.execute(sql, params);
    return results;
  } catch (error) {
    console.error("Database query failed:", error);
    // Re-throw the error to be handled by the caller
    throw error;
  }
}
