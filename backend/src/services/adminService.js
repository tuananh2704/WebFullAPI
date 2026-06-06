const pool = require("../configs/db");
const membershipService = require("./membershipService");
const notificationService = require("./notificationService");

const ensureColumn = async (db, tableName, columnName, definition) => {
  const [rows] = await db.execute(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );

  if (!rows[0]) {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
};

const ensureIndex = async (db, tableName, indexName, columnName) => {
  const [rows] = await db.execute(
    `
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    LIMIT 1
    `,
    [tableName, indexName]
  );

  if (!rows[0]) {
    await db.execute(`CREATE INDEX \`${indexName}\` ON \`${tableName}\`(\`${columnName}\`)`);
  }
};

const dropUniqueVoucherIndexes = async (db) => {
  const [rows] = await db.execute(
    `
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_vouchers'
      AND COLUMN_NAME IN ('promotion_id', 'code')
      AND NON_UNIQUE = 0
      AND INDEX_NAME <> 'PRIMARY'
    GROUP BY INDEX_NAME
    `
  );

  for (const row of rows) {
    await db.execute(`ALTER TABLE user_vouchers DROP INDEX \`${row.INDEX_NAME}\``);
  }
};

const ensureAdminVoucherSchema = async (db = pool) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_vouchers (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      promotion_id BIGINT NOT NULL,
      code VARCHAR(50) NOT NULL,
      discount_amount INT NOT NULL,
      points_cost INT NOT NULL DEFAULT 0,
      status ENUM('AVAILABLE','RESERVED','USED') NOT NULL DEFAULT 'AVAILABLE',
      booking_id BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reserved_at TIMESTAMP NULL,
      expires_at DATETIME NULL,
      source ENUM('POINT_EXCHANGE','ADMIN_GIFT') NOT NULL DEFAULT 'ADMIN_GIFT',
      target_tier_id INT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY (target_tier_id) REFERENCES membership_tiers(id) ON DELETE SET NULL
    )
  `);
  await db.execute(
    "ALTER TABLE user_vouchers MODIFY status ENUM('AVAILABLE','RESERVED','USED') NOT NULL DEFAULT 'AVAILABLE'"
  );
  await ensureColumn(db, "user_vouchers", "expires_at", "expires_at DATETIME NULL");
  await ensureColumn(
    db,
    "user_vouchers",
    "source",
    "source ENUM('POINT_EXCHANGE','ADMIN_GIFT') NOT NULL DEFAULT 'POINT_EXCHANGE'"
  );
  await ensureColumn(db, "user_vouchers", "target_tier_id", "target_tier_id INT NULL");
  await ensureIndex(db, "user_vouchers", "idx_user_vouchers_promotion", "promotion_id");
  await ensureIndex(db, "user_vouchers", "idx_user_vouchers_code", "code");
  await dropUniqueVoucherIndexes(db);
};

const generateAdminVoucherCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 10; i += 1) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CINE${suffix}`;
};

const autoCancelExpiredPendingBookings = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [expiredBookings] = await connection.execute(
      `
      SELECT b.id
      FROM bookings b
      JOIN showtimes s ON s.id = b.showtime_id
      WHERE b.booking_status = 'PENDING'
        AND s.start_time < NOW()
      FOR UPDATE
      `
    );

    for (const booking of expiredBookings) {
      await connection.execute(
        "UPDATE bookings SET booking_status = 'CANCELLED' WHERE id = ?",
        [booking.id]
      );

      try {
        await membershipService.awardCancellationRefundPoints(connection, booking.id);
      } catch (error) {
        if (error.statusCode !== 404 && error.message !== "Booking not found") {
          throw error;
        }

        await connection.execute(
          `
          UPDATE payments
          SET payment_status = 'FAILED'
          WHERE booking_id = ?
            AND payment_status IN ('PENDING', 'SUCCESS')
          `,
          [booking.id]
        );
        await membershipService.restoreBookingVouchers(connection, booking.id);
        await membershipService.restoreBookingBenefits(connection, booking.id);
      }
    }

    await connection.commit();
    return expiredBookings.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getDashboardStatistics = async () => {
  await autoCancelExpiredPendingBookings();

  const [[movieStats]] = await pool.execute("SELECT COUNT(*) AS total_movies FROM movies");
  const [[bookingStats]] = await pool.execute("SELECT COUNT(*) AS total_bookings FROM bookings");
  const [[userStats]] = await pool.execute("SELECT COUNT(*) AS total_users FROM users");
  const [[pendingBookingStats]] = await pool.execute(
    "SELECT COUNT(*) AS pending_bookings FROM bookings WHERE booking_status = 'PENDING'"
  );
  const [[revenueStats]] = await pool.execute(
    `
    SELECT COALESCE(SUM(amount), 0) AS total_revenue
    FROM payments
    WHERE payment_status = 'SUCCESS'
    `
  );
  const [topMovies] = await pool.execute(
    `
    SELECT m.id, m.title, COUNT(b.id) AS total_bookings
    FROM movies m
    LEFT JOIN showtimes s ON s.movie_id = m.id
    LEFT JOIN bookings b ON b.showtime_id = s.id
    GROUP BY m.id
    ORDER BY total_bookings DESC
    LIMIT 5
    `
  );
  const [bookingStatus] = await pool.execute(
    `
    SELECT booking_status AS status, COUNT(*) AS total
    FROM bookings
    GROUP BY booking_status
    ORDER BY booking_status
    `
  );
  const [monthlyRevenue] = await pool.execute(
    `
    SELECT DATE_FORMAT(s.start_time, '%Y-%m') AS month, COALESCE(SUM(p.amount), 0) AS revenue
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN showtimes s ON s.id = b.showtime_id
    WHERE p.payment_status = 'SUCCESS'
    GROUP BY DATE_FORMAT(s.start_time, '%Y-%m')
    ORDER BY month DESC
    LIMIT 6
    `
  );
  const [[todayRevenue]] = await pool.execute(
    `
    SELECT COALESCE(SUM(p.amount), 0) AS today_revenue
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN showtimes s ON s.id = b.showtime_id
    WHERE p.payment_status = 'SUCCESS'
      AND DATE(s.start_time) = CURDATE()
    `
  );
  const [[todayTickets]] = await pool.execute(
    `
    SELECT COUNT(bs.seat_id) AS today_tickets
    FROM booking_seats bs
    JOIN bookings b ON b.id = bs.booking_id
    JOIN showtimes s ON s.id = b.showtime_id
    JOIN payments p ON p.booking_id = b.id
    WHERE p.payment_status = 'SUCCESS'
      AND DATE(s.start_time) = CURDATE()
    `
  );
  const [topCinemas] = await pool.execute(
    `
    SELECT c.id, c.name AS cinema_name, COALESCE(SUM(p.amount), 0) AS revenue
    FROM cinemas c
    JOIN rooms r ON r.cinema_id = c.id
    JOIN showtimes s ON s.room_id = r.id
    JOIN bookings b ON b.showtime_id = s.id
    JOIN payments p ON p.booking_id = b.id
    WHERE p.payment_status = 'SUCCESS'
    GROUP BY c.id
    ORDER BY revenue DESC
    LIMIT 5
    `
  );
  const [topCombos] = await pool.execute(
    `
    SELECT f.id, f.name, SUM(bf.quantity) AS total_quantity,
           COALESCE(SUM(bf.quantity * bf.unit_price), 0) AS total_revenue
    FROM booking_foods bf
    JOIN foods f ON f.id = bf.food_id
    JOIN food_categories fc ON fc.id = f.category_id
    JOIN bookings b ON b.id = bf.booking_id
    JOIN payments p ON p.booking_id = b.id
    WHERE p.payment_status = 'SUCCESS'
      AND fc.name = 'Combo'
    GROUP BY f.id
    ORDER BY total_quantity DESC
    LIMIT 5
    `
  );
  const [sevenDayRevenueRows] = await pool.execute(
    `
    SELECT DATE(s.start_time) AS day, COALESCE(SUM(p.amount), 0) AS revenue
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN showtimes s ON s.id = b.showtime_id
    WHERE p.payment_status = 'SUCCESS'
      AND DATE(s.start_time) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()
    GROUP BY DATE(s.start_time)
    ORDER BY day ASC
    `
  );

  const revenueByDay = new Map(
    sevenDayRevenueRows.map((row) => [row.day, Number(row.revenue)])
  );

  const last7DaysRevenue = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - idx));
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
    return {
      day,
      revenue: revenueByDay.get(day) ?? 0,
    };
  });

  return {
    total_movies: movieStats.total_movies,
    total_bookings: bookingStats.total_bookings,
    pending_bookings: pendingBookingStats.pending_bookings,
    total_users: userStats.total_users,
    total_revenue: revenueStats.total_revenue,
    today_revenue: todayRevenue.today_revenue,
    today_tickets: todayTickets.today_tickets,
    top_movies: topMovies,
    top_cinemas: topCinemas,
    top_combos: topCombos,
    booking_status: bookingStatus,
    monthly_revenue: monthlyRevenue.reverse(),
    last_7d_revenue: last7DaysRevenue,
  };
};

const getAdminBookings = async (filters = {}) => {
  await autoCancelExpiredPendingBookings();

  const {
    search,
    status,
    date_from,
    date_to,
    page = 1,
    limit = 20,
  } = filters;

  const parsedPage = Number(page) > 0 ? Number(page) : 1;
  const parsedLimit = Number(limit) > 0 ? Number(limit) : 20;
  const offset = (parsedPage - 1) * parsedLimit;

  const safeOffset = Math.max(0, Number.parseInt(offset, 10) || 0);
  const safeLimit = Math.max(1, Number.parseInt(parsedLimit, 10) || 20);

  let whereSql = "WHERE 1=1";
  const params = [];

  if (search) {
    whereSql += " AND (b.booking_code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (status && status !== "ALL") {
    whereSql += " AND b.booking_status = ?";
    params.push(status);
  }

  if (date_from) {
    whereSql += " AND DATE(s.start_time) >= ?";
    params.push(date_from);
  }

  if (date_to) {
    whereSql += " AND DATE(s.start_time) <= ?";
    params.push(date_to);
  }

  // Count total bookings
  const countSql = `
    SELECT COUNT(DISTINCT b.id) as total
    FROM bookings b
    JOIN showtimes s ON s.id = b.showtime_id
    JOIN movies m ON m.id = s.movie_id
    LEFT JOIN users u ON u.id = b.user_id
    ${whereSql}
  `;

  // Get paginated bookings with latest payment info
  const dataSql = `
    SELECT
      b.id, b.booking_code, b.total_amount, b.booking_status,
      b.showtime_id, s.start_time, m.title AS movie_title,
      u.full_name AS customer_name, u.email AS customer_email,
      COALESCE(p.payment_method, 'CASH') AS payment_method,
      COALESCE(p.payment_status, 'PENDING') AS payment_status
    FROM bookings b
    JOIN showtimes s ON s.id = b.showtime_id
    JOIN movies m ON m.id = s.movie_id
    LEFT JOIN users u ON u.id = b.user_id
    LEFT JOIN payments p ON p.id = (
      SELECT id FROM payments WHERE booking_id = b.id ORDER BY id DESC LIMIT 1
    )
    ${whereSql}
    ORDER BY b.id DESC
    LIMIT ${safeOffset}, ${safeLimit}
  `;

  try {
    const [countResult] = await pool.execute(countSql, params);
    const totalCount = countResult[0]?.total || 0;

    const [rows] = await pool.execute(dataSql, params);

    return {
      items: rows || [],
      total: totalCount,
      page: parsedPage,
      limit: parsedLimit,
    };
  } catch (error) {
    const AppError = require("../utils/AppError");
    throw new AppError(`Error fetching bookings: ${error.message}`, 500);
  }
};

const updateBookingStatus = async (bookingId, status) => {
  await autoCancelExpiredPendingBookings();

  const allowedStatuses = ["PENDING", "CONFIRMED", "CANCELLED"];
  if (!allowedStatuses.includes(status)) {
    const AppError = require("../utils/AppError");
    throw new AppError("Invalid booking status", 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [bookingRows] = await connection.execute(
      `
      SELECT b.*, s.start_time
      FROM bookings b
      JOIN showtimes s ON s.id = b.showtime_id
      WHERE b.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [bookingId]
    );

    if (!bookingRows[0]) {
      const AppError = require("../utils/AppError");
      throw new AppError("Booking not found", 404);
    }

    const previousStatus = bookingRows[0].booking_status;

    if (previousStatus !== "PENDING" && status !== previousStatus) {
      const AppError = require("../utils/AppError");
      throw new AppError("Chỉ đơn PENDING mới có thể cập nhật trạng thái.", 400);
    }

    if (status === "CONFIRMED" && new Date(bookingRows[0].start_time).getTime() < Date.now()) {
      const AppError = require("../utils/AppError");
      throw new AppError("Booking đã quá giờ chiếu nên không thể duyệt.", 400);
    }

    await connection.execute("UPDATE bookings SET booking_status = ? WHERE id = ?", [
      status,
      bookingId,
    ]);

    if (status === "CONFIRMED") {
      await connection.execute(
        "UPDATE payments SET payment_status = 'SUCCESS' WHERE booking_id = ? AND payment_status = 'PENDING'",
        [bookingId]
      );
      await membershipService.awardBookingRewards(connection, bookingId);
    }

    if (previousStatus !== "CANCELLED" && status === "CANCELLED") {
      await membershipService.awardCancellationRefundPoints(connection, bookingId);
    }

    const [rows] = await connection.execute("SELECT * FROM bookings WHERE id = ? LIMIT 1", [
      bookingId,
    ]);

    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const approvePendingBookings = async (filters = {}) => {
  await autoCancelExpiredPendingBookings();

  const { search, status, date_from, date_to } = filters;

  if (status && !["ALL", "PENDING"].includes(status)) {
    return { approved: 0 };
  }

  let whereSql = `
    WHERE b.booking_status = 'PENDING'
      AND s.start_time >= NOW()
  `;
  const params = [];

  if (search) {
    whereSql += " AND (b.booking_code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (date_from) {
    whereSql += " AND DATE(s.start_time) >= ?";
    params.push(date_from);
  }

  if (date_to) {
    whereSql += " AND DATE(s.start_time) <= ?";
    params.push(date_to);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `
      SELECT b.id
      FROM bookings b
      JOIN showtimes s ON s.id = b.showtime_id
      LEFT JOIN users u ON u.id = b.user_id
      ${whereSql}
      ORDER BY b.id ASC
      FOR UPDATE
      `,
      params
    );

    for (const booking of rows) {
      await connection.execute("UPDATE bookings SET booking_status = 'CONFIRMED' WHERE id = ?", [
        booking.id,
      ]);
      await connection.execute(
        "UPDATE payments SET payment_status = 'SUCCESS' WHERE booking_id = ? AND payment_status = 'PENDING'",
        [booking.id]
      );
      await membershipService.awardBookingRewards(connection, booking.id);
    }

    await connection.commit();
    return { approved: rows.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getUsers = async (filters = {}) => {
  const { role, search } = filters;
  let query = `
    SELECT u.id, u.full_name, u.email, u.phone, u.status as is_active,
           GROUP_CONCAT(r.name) as roles,
           COALESCE(um.points, 0) as membership_points,
           COALESCE(mt.name, 'Thành viên') as membership_tier_name,
           COALESCE(mt.color_hex, '#9E9E9E') as membership_tier_color
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    LEFT JOIN user_memberships um ON um.user_id = u.id
    LEFT JOIN membership_tiers mt ON mt.id = um.tier_id
    WHERE 1=1
  `;
  const params = [];

  if (role) {
    query += " AND r.name = ?";
    params.push(role);
  }

  if (search) {
    query += " AND (u.full_name LIKE ? OR u.email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += `
    GROUP BY u.id, u.full_name, u.email, u.phone, u.status,
             um.points, mt.name, mt.color_hex
    ORDER BY u.id DESC
  `;

  const [rows] = await pool.execute(query, params);
  return rows;
};

const updateUserRole = async (userId, newRole) => {
  const allowedRoles = ["CUSTOMER", "EMPLOYEE"];
  if (!allowedRoles.includes(newRole)) {
    const AppError = require("../utils/AppError");
    throw new AppError("Cannot assign ADMIN role via this API", 400);
  }

  // Check if user is already ADMIN to prevent any change to the admin account
  const [[userRole]] = await pool.execute(
    `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?`, 
    [userId]
  );

  if (userRole && userRole.name === "ADMIN") {
    const AppError = require("../utils/AppError");
    throw new AppError("System Administrator account cannot be changed", 403);
  }

  await pool.execute("DELETE FROM user_roles WHERE user_id = ?", [userId]);
  const [[roleRow]] = await pool.execute("SELECT id FROM roles WHERE name = ?", [newRole]);
  
  if (!roleRow) {
    const AppError = require("../utils/AppError");
    throw new AppError("Role not found", 404);
  }

  await pool.execute("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleRow.id]);
  return { userId, newRole };
};

const updateUserStatus = async (userId, status) => {
  const allowedStatuses = ["ACTIVE", "BLOCKED"];
  if (!allowedStatuses.includes(status)) {
    const AppError = require("../utils/AppError");
    throw new AppError("Invalid status", 400);
  }

  await pool.execute("UPDATE users SET status = ? WHERE id = ?", [status, userId]);
  const [rows] = await pool.execute("SELECT id, status FROM users WHERE id = ? LIMIT 1", [userId]);
  return rows[0];
};

const deleteUser = async (userId) => {
  // Check if user is BLOCKED before deleting
  const [[user]] = await pool.execute("SELECT status FROM users WHERE id = ?", [userId]);
  if (!user || user.status !== "BLOCKED") {
    const AppError = require("../utils/AppError");
    throw new AppError("Only blocked accounts can be deleted", 400);
  }

  await pool.execute("DELETE FROM users WHERE id = ?", [userId]);
  return { userId, deleted: true };
};

const getUserDetail = async (userId) => {
  const [userRows] = await pool.execute(
    `SELECT u.id, u.full_name, u.email, u.phone, u.birth_date, u.status,
            GROUP_CONCAT(r.name) as roles,
            COALESCE(um.points, 0) as membership_points,
            COALESCE(mt.name, 'Thành viên') as membership_tier_name,
            COALESCE(mt.color_hex, '#9E9E9E') as membership_tier_color
     FROM users u
     JOIN user_roles ur ON u.id = ur.user_id
     JOIN roles r ON ur.role_id = r.id
     LEFT JOIN user_memberships um ON um.user_id = u.id
     LEFT JOIN membership_tiers mt ON mt.id = um.tier_id
     WHERE u.id = ?
     GROUP BY u.id, u.full_name, u.email, u.phone, u.birth_date, u.status,
              um.points, mt.name, mt.color_hex`,
    [userId]
  );
  return userRows[0];
};

const createUserVoucher = async (userId, payload = {}) => {
  const AppError = require("../utils/AppError");
  const discountAmount = Math.floor(Number(payload.discount_amount || 0));
  const scope = payload.scope === "VIP" ? "VIP" : "GENERAL";

  if (!discountAmount || discountAmount < 1000) {
    throw new AppError("Giá trị voucher phải từ 1.000đ trở lên.", 400);
  }

  await ensureAdminVoucherSchema();
  await notificationService.ensureNotificationTables();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [userRows] = await connection.execute(
      `
      SELECT u.id, u.full_name, u.email, um.tier_id, mt.name AS tier_name
      FROM users u
      LEFT JOIN user_memberships um ON um.user_id = u.id
      LEFT JOIN membership_tiers mt ON mt.id = um.tier_id
      WHERE u.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );

    const user = userRows[0];
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const targetTierId = scope === "VIP" ? user.tier_id || null : null;
    if (scope === "VIP" && !targetTierId) {
      throw new AppError("Người dùng chưa có hạng VIP để gửi voucher VIP.", 400);
    }

    let code = generateAdminVoucherCode();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const [existing] = await connection.execute(
        "SELECT id FROM promotions WHERE code = ? LIMIT 1",
        [code]
      );
      if (!existing[0]) break;
      code = generateAdminVoucherCode();
    }

    const [duplicateRows] = await connection.execute(
      "SELECT id FROM promotions WHERE code = ? LIMIT 1",
      [code]
    );
    if (duplicateRows[0]) {
      throw new AppError("Không tạo được mã voucher, vui lòng thử lại.", 500);
    }

    const [promotionResult] = await connection.execute(
      `
      INSERT INTO promotions(code, name, discount_type, discount_value, min_amount, expire_date, is_active)
      VALUES (?, ?, 'FIXED', ?, 0, DATE_ADD(CURDATE(), INTERVAL 5 DAY), TRUE)
      `,
      [
        code,
        scope === "VIP"
          ? `Voucher VIP ${user.tier_name || ""}`.trim()
          : "Voucher khách hàng",
        discountAmount,
      ]
    );

    const [voucherResult] = await connection.execute(
      `
      INSERT INTO user_vouchers
        (user_id, promotion_id, code, discount_amount, points_cost, expires_at, source, target_tier_id)
      VALUES (?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 5 DAY), 'ADMIN_GIFT', ?)
      `,
      [user.id, promotionResult.insertId, code, discountAmount, targetTierId]
    );

    await notificationService.createNotification(
      {
        user_id: user.id,
        title: "Bạn nhận được voucher mới",
        message:
          scope === "VIP"
            ? `CINEMAX gửi bạn voucher ${code} trị giá ${discountAmount.toLocaleString("vi-VN")}đ dành cho hạng ${user.tier_name}. Mã có hạn 5 ngày.`
            : `CINEMAX gửi bạn voucher ${code} trị giá ${discountAmount.toLocaleString("vi-VN")}đ. Mã có hạn 5 ngày.`,
        type: "VOUCHER",
        payload: {
          voucher_id: voucherResult.insertId,
          code,
          discount_amount: discountAmount,
          scope,
          target_tier_name: scope === "VIP" ? user.tier_name : null,
          expires_in_days: 5,
        },
      },
      connection
    );

    await connection.commit();

    return {
      id: voucherResult.insertId,
      user_id: user.id,
      code,
      discount_amount: discountAmount,
      scope,
      target_tier_id: targetTierId,
      target_tier_name: scope === "VIP" ? user.tier_name : null,
      expires_in_days: 5,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const createBulkUserVoucher = async (payload = {}) => {
  const AppError = require("../utils/AppError");
  const discountAmount = Math.floor(Number(payload.discount_amount || 0));
  const requestedCode = String(payload.code || "").trim().toUpperCase();

  if (!discountAmount || discountAmount < 1000) {
    throw new AppError("Giá trị voucher phải từ 1.000đ trở lên.", 400);
  }

  await ensureAdminVoucherSchema();
  await notificationService.ensureNotificationTables();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [eligibleUsers] = await connection.execute(
      `
      SELECT u.id, u.full_name, u.email
      FROM users u
      WHERE u.status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = u.id
            AND r.name = 'ADMIN'
        )
      ORDER BY u.id ASC
      FOR UPDATE
      `
    );

    if (eligibleUsers.length === 0) {
      throw new AppError("Không có tài khoản hợp lệ để gửi voucher.", 400);
    }

    let code = /^[A-Z0-9]{6,30}$/.test(requestedCode) ? requestedCode : generateAdminVoucherCode();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const [existing] = await connection.execute(
        "SELECT id FROM promotions WHERE code = ? LIMIT 1",
        [code]
      );
      if (!existing[0]) break;
      code = generateAdminVoucherCode();
    }

    const [duplicateRows] = await connection.execute(
      "SELECT id FROM promotions WHERE code = ? LIMIT 1",
      [code]
    );
    if (duplicateRows[0]) {
      throw new AppError("Không tạo được mã voucher, vui lòng thử lại.", 500);
    }

    const [promotionResult] = await connection.execute(
      `
      INSERT INTO promotions(code, name, discount_type, discount_value, min_amount, expire_date, is_active)
      VALUES (?, 'Voucher chung CINEMAX', 'FIXED', ?, 0, DATE_ADD(CURDATE(), INTERVAL 5 DAY), TRUE)
      `,
      [code, discountAmount]
    );

    for (const user of eligibleUsers) {
      const [voucherResult] = await connection.execute(
        `
        INSERT INTO user_vouchers
          (user_id, promotion_id, code, discount_amount, points_cost, expires_at, source, target_tier_id)
        VALUES (?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 5 DAY), 'ADMIN_GIFT', NULL)
        `,
        [user.id, promotionResult.insertId, code, discountAmount]
      );

      await notificationService.createNotification(
        {
          user_id: user.id,
          title: "Bạn nhận được voucher chung",
          message: `CINEMAX gửi bạn voucher ${code} trị giá ${discountAmount.toLocaleString("vi-VN")}đ. Mã có hạn 5 ngày và chỉ dùng 1 lần.`,
          type: "VOUCHER",
          payload: {
            voucher_id: voucherResult.insertId,
            code,
            discount_amount: discountAmount,
            scope: "GENERAL",
            expires_in_days: 5,
          },
        },
        connection
      );
    }

    await connection.commit();

    return {
      code,
      discount_amount: discountAmount,
      sent_count: eligibleUsers.length,
      expires_in_days: 5,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getAdminFoods = async () => {
  const [rows] = await pool.execute(
    `
    SELECT f.id, f.category_id, fc.name AS category_name, f.name, f.description, f.image_url
    FROM foods f
    LEFT JOIN food_categories fc ON fc.id = f.category_id
    ORDER BY fc.name ASC, f.name ASC
    `
  );

  return rows;
};

const createAdminFood = async ({ name, description, image_url, category_id }) => {
  if (!name || !category_id) {
    const AppError = require("../utils/AppError");
    throw new AppError("Name and category are required", 400);
  }

  const [result] = await pool.execute(
    "INSERT INTO foods (category_id, name, description, image_url) VALUES (?, ?, ?, ?)",
    [category_id, name, description || null, image_url || null]
  );

  const [rows] = await pool.execute(
    `
    SELECT f.id, f.category_id, fc.name AS category_name, f.name, f.description, f.image_url
    FROM foods f
    LEFT JOIN food_categories fc ON fc.id = f.category_id
    WHERE f.id = ?
    LIMIT 1
    `,
    [result.insertId]
  );

  return rows[0];
};

const updateAdminFood = async (foodId, { name, description, image_url, category_id }) => {
  if (!name || !category_id) {
    const AppError = require("../utils/AppError");
    throw new AppError("Name and category are required", 400);
  }

  await pool.execute(
    "UPDATE foods SET category_id = ?, name = ?, description = ?, image_url = ? WHERE id = ?",
    [category_id, name, description || null, image_url || null, foodId]
  );

  const [rows] = await pool.execute(
    `
    SELECT f.id, f.category_id, fc.name AS category_name, f.name, f.description, f.image_url
    FROM foods f
    LEFT JOIN food_categories fc ON fc.id = f.category_id
    WHERE f.id = ?
    LIMIT 1
    `,
    [foodId]
  );

  return rows[0];
};

const deleteAdminFood = async (foodId) => {
  await pool.execute("DELETE FROM foods WHERE id = ?", [foodId]);
  return { foodId, deleted: true };
};

const createAdminFoodSize = async ({ food_id, size_name, price }) => {
  const allowedSizes = ["S", "M", "L"];
  if (!food_id || !size_name || !price) {
    const AppError = require("../utils/AppError");
    throw new AppError("Food, size and price are required", 400);
  }
  if (!allowedSizes.includes(size_name)) {
    const AppError = require("../utils/AppError");
    throw new AppError("Size must be one of S, M, L", 400);
  }

  const [result] = await pool.execute(
    "INSERT INTO food_sizes (food_id, size_name, price) VALUES (?, ?, ?)",
    [food_id, size_name, price]
  );

  const [rows] = await pool.execute(
    `
    SELECT fs.id, fs.food_id, f.name AS food_name, fs.size_name, fs.price
    FROM food_sizes fs
    JOIN foods f ON f.id = fs.food_id
    WHERE fs.id = ?
    LIMIT 1
    `,
    [result.insertId]
  );

  return rows[0];
};

const updateAdminFoodSize = async (sizeId, { size_name, price }) => {
  const allowedSizes = ["S", "M", "L"];
  if (!size_name || !price) {
    const AppError = require("../utils/AppError");
    throw new AppError("Size and price are required", 400);
  }
  if (!allowedSizes.includes(size_name)) {
    const AppError = require("../utils/AppError");
    throw new AppError("Size must be one of S, M, L", 400);
  }

  await pool.execute(
    "UPDATE food_sizes SET size_name = ?, price = ? WHERE id = ?",
    [size_name, price, sizeId]
  );

  const [rows] = await pool.execute(
    `
    SELECT fs.id, fs.food_id, f.name AS food_name, fs.size_name, fs.price
    FROM food_sizes fs
    JOIN foods f ON f.id = fs.food_id
    WHERE fs.id = ?
    LIMIT 1
    `,
    [sizeId]
  );

  return rows[0];
};

const deleteAdminFoodSize = async (sizeId) => {
  await pool.execute("DELETE FROM food_sizes WHERE id = ?", [sizeId]);
  return { sizeId, deleted: true };
};

const exportBookings = async (filters = {}) => {
  await autoCancelExpiredPendingBookings();

  const { status, date_from, date_to } = filters;

  let whereSql = "WHERE 1=1";
  const params = [];

  if (status && status !== "ALL") {
    whereSql += " AND b.booking_status = ?";
    params.push(status);
  }

  if (date_from) {
    whereSql += " AND DATE(s.start_time) >= ?";
    params.push(date_from);
  }

  if (date_to) {
    whereSql += " AND DATE(s.start_time) <= ?";
    params.push(date_to);
  }

  const sql = `
    SELECT
      b.booking_code,
      u.full_name AS customer_name,
      u.email AS customer_email,
      m.title AS movie_title,
      s.start_time,
      b.total_amount,
      b.booking_status,
      COALESCE(p.payment_status, 'PENDING') AS payment_status,
      COALESCE(p.payment_method, 'CASH') AS payment_method
    FROM bookings b
    JOIN showtimes s ON s.id = b.showtime_id
    JOIN movies m ON m.id = s.movie_id
    LEFT JOIN users u ON u.id = b.user_id
    LEFT JOIN payments p ON p.id = (
      SELECT id FROM payments WHERE booking_id = b.id ORDER BY id DESC LIMIT 1
    )
    ${whereSql}
    ORDER BY b.id DESC
  `;

  try {
    const [rows] = await pool.execute(sql, params);

    // Transform data for CSV (fields required by Admin export spec)
    const fields = [
      "booking_code",
      "customer_name",
      "customer_email",
      "movie_title",
      "start_time",
      "total_amount",
      "booking_status",
      "payment_method",
      "payment_status",
    ];

    const csvData = rows.map((row) => ({
      booking_code: row.booking_code,
      customer_name: row.customer_name || "N/A",
      customer_email: row.customer_email || "N/A",
      movie_title: row.movie_title,
      start_time: row.start_time ? new Date(row.start_time).toISOString() : "",
      total_amount: row.total_amount,
      booking_status: row.booking_status,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
    }));

    const { parse } = require("json2csv");
    const csv = parse(csvData, { fields });
    return csv;
  } catch (error) {
    const AppError = require("../utils/AppError");
    throw new AppError(`Error exporting bookings: ${error.message}`, 500);
  }
};

const exportRevenue = async (year) => {
  const parsedYear = parseInt(year, 10);
  if (isNaN(parsedYear)) {
    const AppError = require("../utils/AppError");
    throw new AppError("Invalid year", 400);
  }

  const sql = `
    SELECT 
      DATE_FORMAT(s.start_time, '%m') AS month_num,
      DATE_FORMAT(s.start_time, 'Tháng %m, %Y') AS month_display,
      COALESCE(SUM(p.amount), 0) AS revenue
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN showtimes s ON s.id = b.showtime_id
    WHERE YEAR(s.start_time) = ? AND p.payment_status = 'SUCCESS'
    GROUP BY DATE_FORMAT(s.start_time, '%Y-%m'), DATE_FORMAT(s.start_time, '%m'), DATE_FORMAT(s.start_time, 'Tháng %m, %Y')
    ORDER BY DATE_FORMAT(s.start_time, '%Y-%m') ASC
  `;

  try {
    const [rows] = await pool.execute(sql, [parsedYear]);

    // Fill in missing months with 0 revenue
    const monthsMap = new Map();
    for (let i = 1; i <= 12; i++) {
      const monthStr = String(i).padStart(2, "0");
      const monthDisplay = `Tháng ${i}, ${parsedYear}`;
      monthsMap.set(monthStr, { month: monthDisplay, revenue: 0 });
    }

    rows.forEach((row) => {
      const monthNum = row.month_num;
      monthsMap.set(monthNum, {
        month: row.month_display,
        revenue: row.revenue,
      });
    });

    const csvData = Array.from(monthsMap.values()).map((item) => ({
      month: item.month,
      revenue: item.revenue,
    }));

    const { parse } = require("json2csv");
    const csv = parse(csvData, { fields: ["month", "revenue"] });
    return csv;
  } catch (error) {
    const AppError = require("../utils/AppError");
    throw new AppError(`Error exporting revenue: ${error.message}`, 500);
  }
};

module.exports = {
  getDashboardStatistics,
  getAdminBookings,
  updateBookingStatus,
  approvePendingBookings,
  getUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getUserDetail,
  createUserVoucher,
  createBulkUserVoucher,
  getAdminFoods,
  createAdminFood,
  updateAdminFood,
  deleteAdminFood,
  createAdminFoodSize,
  updateAdminFoodSize,
  deleteAdminFoodSize,
  exportBookings,
  exportRevenue,
};
