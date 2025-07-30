
import mysql from "mysql2/promise";
import * as functions from "firebase-functions";

// Configuration for the MySQL connection pool
const config = {
  host: functions.config().mysql.host || "193.203.175.34", // IP from your Hostinger panel
  user: functions.config().mysql.user || "u965232645_dajusticia",
  password: functions.config().mysql.password || "D@justicia162804",
  database: functions.config().mysql.database || "u965232645_dajusticia",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create the connection pool. The pool-specific settings are the defaults
export const pool = mysql.createPool(config);

/**
 * Executes a SQL query and returns the results.
 * It automatically handles getting a connection from the pool and releasing it.
 * @param {string} sql The SQL query to execute.
 * @param {any[]} [params] The parameters to bind to the query.
 * @return {Promise<any>} A promise that resolves with the query results.
 */
export async function queryDatabase(sql: string, params?: any[]): Promise<any> {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error("Database query failed:", error);
    // Re-throw the error to be handled by the caller
    throw error;
  }
}
