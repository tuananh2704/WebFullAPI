const bcrypt = require("bcrypt");
const pool = require("../configs/db");
const AppError = require("../utils/AppError");
const { signToken } = require("../utils/jwt");

const publicUserFields = `
  u.id, u.full_name, u.email, u.phone, u.status,
  COALESCE(JSON_ARRAYAGG(r.name), JSON_ARRAY()) AS roles
`;

const normalizeUser = (user) => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone,
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

const register = async ({ full_name, email, phone, password }) => {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AppError("Email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // Transaction keeps user creation and role assignment consistent.
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
      INSERT INTO users(full_name, email, phone, password_hash, status)
      VALUES (?, ?, ?, ?, 'ACTIVE')
      `,
      [full_name, email, phone || null, passwordHash]
    );

    const [roles] = await connection.execute("SELECT id FROM roles WHERE name = 'CUSTOMER' LIMIT 1");
    await connection.execute("INSERT INTO user_roles(user_id, role_id) VALUES (?, ?)", [
      result.insertId,
      roles[0].id,
    ]);

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

const login = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user || user.status !== "ACTIVE") {
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

module.exports = {
  register,
  login,
  findUserById,
};
