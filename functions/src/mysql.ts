
import mysql from "mysql2/promise";
import type {Pool} from "mysql2/promise";

let pool: Pool | null = null;

/**
 * Creates and returns a singleton MySQL connection pool using environment variables.
 * @return {Pool} The MySQL connection pool.
 */
function getPool(): Pool {
  if (!pool) {
    // Configuration for the MySQL connection pool using environment variables.
    // These need to be set in your Firebase project.
    const config = {
      host: process.env.MYSQL_HOST || "193.203.175.34",
      user: process.env.MYSQL_USER || "u965232645_dajusticia",
      password: process.env.MYSQL_PASSWORD || "D@justicia162804",
      database: process.env.MYSQL_DATABASE || "u965232645_dajusticia",
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
