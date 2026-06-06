const bcrypt = require("bcryptjs");
const pool = require("../configs/db");
const AppError = require("../utils/AppError");
const { signToken } = require("../utils/jwt");
const { sendPasswordChangeEmail, sendVerificationEmail } = require("./emailService");

const OTP_TTL_SECONDS = 5 * 60;

let pendingUsersTableReady = false;

const publicUserFields = `
  u.id, u.full_name, u.email, u.phone, u.birth_date, u.status,
  COALESCE(JSON_ARRAYAGG(r.name), JSON_ARRAY()) AS roles
`;

const formatDateOnly = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

const normalizeUser = (user) => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone,
  birth_date: formatDateOnly(user.birth_date),
  status: user.status,
  roles: (typeof user.roles === "string" ? JSON.parse(user.roles) : user.roles).filter(Boolean),
});

const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    `
    SELECT u.*, COALESCE(JSON_ARRAYAGG(r.name), JSON_ARRAY()) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.email = ?
    GROUP BY u.id
    `,
    [email]
  );

  return rows[0];
};

const findUserById = async (userId) => {
  const [rows] = await pool.execute(
    `
    SELECT ${publicUserFields}
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.id = ?
    GROUP BY u.id
    `,
    [userId]
  );

  return rows[0] ? normalizeUser(rows[0]) : null;
};

const ensurePendingUsersTable = async () => {
  if (pendingUsersTableReady) return;

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS pending_users (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      phone VARCHAR(20),
      birth_date DATE,
      password_hash VARCHAR(255) NOT NULL,
      verification_code VARCHAR(6) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  pendingUsersTableReady = true;
};

const cleanupExpiredPendingUsers = async (connection = pool) => {
  await ensurePendingUsersTable();
  await connection.execute("DELETE FROM pending_users WHERE expires_at <= NOW()");
};

const generateVerificationCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const schedulePendingUserDeletion = (email, verificationCode) => {
  setTimeout(() => {
    cleanupExpiredPendingUsers()
      .then(() =>
        pool.execute(
          "DELETE FROM pending_users WHERE email = ? AND verification_code = ? AND expires_at <= NOW()",
          [email, verificationCode]
        )
      )
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to delete expired pending user", error);
        }
      });
  }, OTP_TTL_SECONDS * 1000).unref();
};

const register = async ({ full_name, email, phone, birth_date, password }) => {
  await cleanupExpiredPendingUsers();

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AppError("Email already exists", 409);
  }

  if (!birth_date || Number.isNaN(new Date(`${birth_date}T00:00:00`).getTime())) {
    throw new AppError("Ngày sinh không hợp lệ", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationCode = generateVerificationCode();

  await pool.execute(
    `
    INSERT INTO pending_users(
      full_name, email, phone, birth_date, password_hash, verification_code, expires_at
    )
    VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
    ON DUPLICATE KEY UPDATE
      full_name = VALUES(full_name),
      phone = VALUES(phone),
      birth_date = VALUES(birth_date),
      password_hash = VALUES(password_hash),
      verification_code = VALUES(verification_code),
      expires_at = VALUES(expires_at),
      created_at = CURRENT_TIMESTAMP
    `,
    [full_name, email, phone || null, birth_date, passwordHash, verificationCode, OTP_TTL_SECONDS]
  );

  try {
    await sendVerificationEmail({ to: email, fullName: full_name, verificationCode });
    } catch (error) {
    await pool.execute("DELETE FROM pending_users WHERE email = ?", [email]);

    console.error("SMTP REGISTER ERROR:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });

    throw new AppError("Không gửi được email OTP. Vui lòng kiểm tra cấu hình SMTP.", 500);
  }

  schedulePendingUserDeletion(email, verificationCode);

  return {
    email,
    expires_in_seconds: OTP_TTL_SECONDS,
  };
};

const verifyRegister = async ({ email, verification_code }) => {
  await cleanupExpiredPendingUsers();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [pendingRows] = await connection.execute(
      `
      SELECT * FROM pending_users
      WHERE email = ? AND verification_code = ? AND expires_at > NOW()
      LIMIT 1
      `,
      [email, verification_code]
    );

    const pendingUser = pendingRows[0];
    if (!pendingUser) {
      await connection.execute("DELETE FROM pending_users WHERE email = ? AND expires_at <= NOW()", [
        email,
      ]);
      throw new AppError("OTP is invalid or expired", 400);
    }

    const [existingRows] = await connection.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [
      email,
    ]);
    if (existingRows[0]) {
      await connection.execute("DELETE FROM pending_users WHERE email = ?", [email]);
      throw new AppError("Email already exists", 409);
    }

    const [result] = await connection.execute(
      `
      INSERT INTO users(full_name, email, phone, birth_date, password_hash, status)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE')
      `,
      [
        pendingUser.full_name,
        pendingUser.email,
        pendingUser.phone,
        pendingUser.birth_date,
        pendingUser.password_hash,
      ]
    );

    const [roles] = await connection.execute("SELECT id FROM roles WHERE name = 'CUSTOMER' LIMIT 1");
    if (!roles[0]) {
      throw new AppError("Customer role is not configured", 500);
    }

    await connection.execute("INSERT INTO user_roles(user_id, role_id) VALUES (?, ?)", [
      result.insertId,
      roles[0].id,
    ]);
    await connection.execute("DELETE FROM pending_users WHERE id = ?", [pendingUser.id]);

    await connection.commit();
    const user = await findUserById(result.insertId);
    const token = signToken({ id: user.id, email: user.email, roles: user.roles });

    return { user, token };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

setInterval(() => {
  cleanupExpiredPendingUsers().catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to cleanup expired pending users", error);
    }
  });
}, 60 * 1000).unref();

const login = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.status === "BLOCKED") {
    throw new AppError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.", 403);
  }

  if (user.status !== "ACTIVE") {
    throw new AppError("Invalid email or password", 401);
  }

  const isBcryptHash = user.password_hash?.startsWith("$2");
  const passwordMatches = isBcryptHash
    ? await bcrypt.compare(password, user.password_hash)
    : password === user.password_hash;

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  // Upgrade old sample plain-text passwords to bcrypt after the first valid login.
  if (!isBcryptHash) {
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, user.id]);
  }

  const safeUser = normalizeUser(user);
  delete safeUser.password_hash;
  const token = signToken({ id: safeUser.id, email: safeUser.email, roles: safeUser.roles });

  return { user: safeUser, token };
};

const requestPasswordChange = async ({ userId, new_password }) => {
  if (!new_password || new_password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  await cleanupExpiredPendingUsers();

  const user = await findUserById(userId);
  if (!user || user.status !== "ACTIVE") {
    throw new AppError("User not found", 404);
  }

  const passwordHash = await bcrypt.hash(new_password, 10);
  const verificationCode = generateVerificationCode();

  await pool.execute(
    `
    INSERT INTO pending_users(
      full_name, email, phone, birth_date, password_hash, verification_code, expires_at
    )
    VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
    ON DUPLICATE KEY UPDATE
      full_name = VALUES(full_name),
      phone = VALUES(phone),
      birth_date = VALUES(birth_date),
      password_hash = VALUES(password_hash),
      verification_code = VALUES(verification_code),
      expires_at = VALUES(expires_at),
      created_at = CURRENT_TIMESTAMP
    `,
    [
      user.full_name,
      user.email,
      user.phone || null,
      user.birth_date,
      passwordHash,
      verificationCode,
      OTP_TTL_SECONDS,
    ]
  );

  try {
    await sendPasswordChangeEmail({
      to: user.email,
      fullName: user.full_name,
      verificationCode,
    });
  } catch (error) {
    await pool.execute("DELETE FROM pending_users WHERE email = ?", [user.email]);
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to send password change email", error);
    }
    throw new AppError("Không gửi được email OTP. Vui lòng kiểm tra cấu hình SMTP.", 500);
  }

  schedulePendingUserDeletion(user.email, verificationCode);

  return {
    email: user.email,
    expires_in_seconds: OTP_TTL_SECONDS,
  };
};

const verifyPasswordChange = async ({ userId, verification_code }) => {
  await cleanupExpiredPendingUsers();

  const user = await findUserById(userId);
  if (!user || user.status !== "ACTIVE") {
    throw new AppError("User not found", 404);
  }

  const [pendingRows] = await pool.execute(
    `
    SELECT * FROM pending_users
    WHERE email = ? AND verification_code = ? AND expires_at > NOW()
    LIMIT 1
    `,
    [user.email, verification_code]
  );

  const pendingUser = pendingRows[0];
  if (!pendingUser) {
    await pool.execute("DELETE FROM pending_users WHERE email = ? AND expires_at <= NOW()", [
      user.email,
    ]);
    throw new AppError("OTP is invalid or expired", 400);
  }

  await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
    pendingUser.password_hash,
    user.id,
  ]);
  await pool.execute("DELETE FROM pending_users WHERE id = ?", [pendingUser.id]);

  return { changed: true };
};

const requestForgotPassword = async ({ email }) => {
  await cleanupExpiredPendingUsers();

  const user = await findUserByEmail(email);
  if (!user || user.status !== "ACTIVE") {
    throw new AppError("Email chua duoc dang ky", 404);
  }

  const verificationCode = generateVerificationCode();

  await pool.execute(
    `
    INSERT INTO pending_users(
      full_name, email, phone, birth_date, password_hash, verification_code, expires_at
    )
    VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
    ON DUPLICATE KEY UPDATE
      full_name = VALUES(full_name),
      phone = VALUES(phone),
      birth_date = VALUES(birth_date),
      password_hash = VALUES(password_hash),
      verification_code = VALUES(verification_code),
      expires_at = VALUES(expires_at),
      created_at = CURRENT_TIMESTAMP
    `,
    [
      user.full_name,
      user.email,
      user.phone || null,
      formatDateOnly(user.birth_date),
      user.password_hash,
      verificationCode,
      OTP_TTL_SECONDS,
    ]
  );

  try {
    await sendPasswordChangeEmail({
      to: user.email,
      fullName: user.full_name,
      verificationCode,
    });
  } catch (error) {
    await pool.execute("DELETE FROM pending_users WHERE email = ?", [user.email]);
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to send forgot password email", error);
    }
    throw new AppError("Khong gui duoc email OTP. Vui long kiem tra cau hinh SMTP.", 500);
  }

  schedulePendingUserDeletion(user.email, verificationCode);

  return {
    email: user.email,
    expires_in_seconds: OTP_TTL_SECONDS,
  };
};

const verifyForgotPasswordCode = async ({ email, verification_code }) => {
  await cleanupExpiredPendingUsers();

  const [pendingRows] = await pool.execute(
    `
    SELECT id FROM pending_users
    WHERE email = ? AND verification_code = ? AND expires_at > NOW()
    LIMIT 1
    `,
    [email, verification_code]
  );

  if (!pendingRows[0]) {
    await pool.execute("DELETE FROM pending_users WHERE email = ? AND expires_at <= NOW()", [
      email,
    ]);
    throw new AppError("OTP is invalid or expired", 400);
  }

  return { verified: true };
};

const resetForgotPassword = async ({ email, verification_code, new_password }) => {
  if (!new_password || new_password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  await cleanupExpiredPendingUsers();

  const user = await findUserByEmail(email);
  if (!user || user.status !== "ACTIVE") {
    throw new AppError("Email chua duoc dang ky", 404);
  }

  const [pendingRows] = await pool.execute(
    `
    SELECT id FROM pending_users
    WHERE email = ? AND verification_code = ? AND expires_at > NOW()
    LIMIT 1
    `,
    [email, verification_code]
  );

  const pendingUser = pendingRows[0];
  if (!pendingUser) {
    await pool.execute("DELETE FROM pending_users WHERE email = ? AND expires_at <= NOW()", [
      email,
    ]);
    throw new AppError("OTP is invalid or expired", 400);
  }

  const passwordHash = await bcrypt.hash(new_password, 10);
  await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, user.id]);
  await pool.execute("DELETE FROM pending_users WHERE id = ?", [pendingUser.id]);

  return { changed: true };
};

module.exports = {
  register,
  verifyRegister,
  login,
  findUserById,
  requestPasswordChange,
  verifyPasswordChange,
  requestForgotPassword,
  verifyForgotPasswordCode,
  resetForgotPassword,
};
