const pool = require("../configs/db");

const ensureNotificationTables = async (db = pool) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(40) NOT NULL DEFAULT 'INFO',
      payload JSON NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
};

const createNotification = async (
  { user_id, title, message, type = "INFO", payload = null },
  db = pool
) => {
  if (db === pool) {
    await ensureNotificationTables(db);
  }
  const [result] = await db.execute(
    `
    INSERT INTO notifications(user_id, title, message, type, payload)
    VALUES (?, ?, ?, ?, ?)
    `,
    [user_id, title, message, type, payload ? JSON.stringify(payload) : null]
  );

  return { id: result.insertId, user_id, title, message, type, payload };
};

const getUserNotifications = async (userId) => {
  await ensureNotificationTables();
  const [rows] = await pool.execute(
    `
    SELECT id, title, message, type, payload, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 30
    `,
    [userId]
  );

  return rows.map((row) => ({
    ...row,
    payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
  }));
};

const markNotificationRead = async (userId, notificationId) => {
  await ensureNotificationTables();
  await pool.execute(
    "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
    [notificationId, userId]
  );
  return { id: Number(notificationId), is_read: true };
};

const markAllNotificationsRead = async (userId) => {
  await ensureNotificationTables();
  await pool.execute("UPDATE notifications SET is_read = TRUE WHERE user_id = ?", [userId]);
  return { updated: true };
};

module.exports = {
  ensureNotificationTables,
  createNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
