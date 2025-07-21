import mysql from 'mysql2/promise';

// This function creates and returns a new database connection.
// It's designed to be called by server actions when they need to interact with the database.
export async function getDbConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      connectTimeout: 10000, // 10 seconds
    });
    return connection;
  } catch (error) {
    console.error("MySQL Connection Error:", error);
    throw new Error("Could not connect to the external database.");
  }
}

// This function safely closes a database connection.
export async function closeDbConnection(connection: mysql.Connection) {
    try {
        await connection.end();
    } catch (error) {
        console.error("MySQL Close Connection Error:", error);
        // We don't re-throw here as the primary operation might have succeeded.
    }
}
