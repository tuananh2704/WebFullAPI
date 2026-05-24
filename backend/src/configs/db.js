const mysql = require("mysql2/promise");
require("dotenv").config();

// A connection pool reuses MySQL connections and is faster than opening
// a new connection for every API request.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
database: process.env.DB_NAME || "cinema_booking",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
});

module.exports = pool;
