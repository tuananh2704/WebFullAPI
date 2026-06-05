const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const VOUCHER_OPTIONS = {
  50000: 50,
  100000: 100,
  200000: 200,
};

const LIMITED_BENEFIT_KEYS = new Set([
  "FREE_POPCORN",
  "FREE_COMBO",
  "FREE_UPGRADE_SEAT",
  "BIRTHDAY_GIFT",
  "LOUNGE_ACCESS",
]);

const ensureVoucherTables = async (db = pool) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_vouchers (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      promotion_id BIGINT NOT NULL UNIQUE,
      code VARCHAR(50) NOT NULL UNIQUE,
      discount_amount INT NOT NULL,
      points_cost INT NOT NULL,
      status ENUM('AVAILABLE','RESERVED','USED') NOT NULL DEFAULT 'AVAILABLE',
      booking_id BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reserved_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    )
  `);
  await db.execute(
    "ALTER TABLE user_vouchers MODIFY status ENUM('AVAILABLE','RESERVED','USED') NOT NULL DEFAULT 'AVAILABLE'"
  );
};

const generateVoucherCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VIP${suffix}`;
};

/**
 * Lấy thông tin membership hiện tại của user
 * Bao gồm: tier info, tổng chi tiêu, điểm, benefits
 */
const getMembership = async (userId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      um.id, um.user_id, um.total_spend, um.points, um.points_used,
      um.tier_updated_at, um.created_at,
      mt.id AS tier_id, mt.name AS tier_name, mt.tier_level,
      mt.min_spend, mt.max_spend, mt.discount_percent,
      mt.point_multiplier, mt.color_hex, mt.icon_url, mt.description AS tier_description
    FROM user_memberships um
    JOIN membership_tiers mt ON mt.id = um.tier_id
    WHERE um.user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  if (!rows[0]) {
    throw new AppError("Membership not found", 404);
  }

  const membership = rows[0];

  // Lấy next tier (nếu chưa Platinum)
  const [nextTierRows] = await pool.execute(
    `
    SELECT id, name, tier_level, min_spend, discount_percent, point_multiplier, color_hex
    FROM membership_tiers
    WHERE tier_level = ? + 1
    LIMIT 1
    `,
    [membership.tier_level]
  );

  // Lấy benefits của tier hiện tại
  const [benefits] = await pool.execute(
    `
    SELECT id, benefit_key, label, value
    FROM membership_benefits
    WHERE tier_id = ?
    ORDER BY id
    `,
    [membership.tier_id]
  );

  // Đếm benefit usage tháng hiện tại
  const [usageRows] = await pool.execute(
    `
    SELECT benefit_key, COUNT(*) AS used_count
    FROM membership_benefit_usage
    WHERE user_id = ?
      AND MONTH(used_at) = MONTH(CURRENT_DATE())
      AND YEAR(used_at) = YEAR(CURRENT_DATE())
    GROUP BY benefit_key
    `,
    [userId]
  );

  const usageMap = {};
  usageRows.forEach((row) => {
    usageMap[row.benefit_key] = row.used_count;
  });

  const visibleBenefits = benefits.map((b) => ({
    ...b,
    used_this_month: usageMap[b.benefit_key] || 0,
  }));

  const nextTier = nextTierRows[0] || null;
  const spendToNextTier = nextTier
    ? Math.max(0, nextTier.min_spend - membership.total_spend)
    : 0;

  return {
    user_id: membership.user_id,
    tier: {
      id: membership.tier_id,
      name: membership.tier_name,
      level: membership.tier_level,
      discount_percent: membership.discount_percent,
      point_multiplier: Number(membership.point_multiplier),
      color_hex: membership.color_hex,
      icon_url: membership.icon_url,
      description: membership.tier_description,
    },
    total_spend: membership.total_spend,
    points: membership.points,
    points_used: membership.points_used,
    points_available: membership.points - membership.points_used,
    tier_updated_at: membership.tier_updated_at,
    member_since: membership.created_at,
    next_tier: nextTier
      ? {
          id: nextTier.id,
          name: nextTier.name,
          min_spend: nextTier.min_spend,
          discount_percent: nextTier.discount_percent,
          spend_remaining: spendToNextTier,
          progress_percent: nextTier.min_spend > 0
            ? Math.min(100, Math.round((membership.total_spend / nextTier.min_spend) * 100))
            : 100,
        }
      : null,
    benefits: visibleBenefits,
  };
};

/**
 * Lấy tất cả tiers (dùng cho trang giới thiệu membership)
 */
const getAllTiers = async () => {
  const [tiers] = await pool.execute(
    `SELECT * FROM membership_tiers ORDER BY tier_level ASC`
  );

  const [benefits] = await pool.execute(
    `SELECT * FROM membership_benefits ORDER BY tier_id, id`
  );

  return tiers.map((tier) => ({
    ...tier,
    point_multiplier: Number(tier.point_multiplier),
    benefits: benefits.filter((b) => b.tier_id === tier.id),
  }));
};

/**
 * Lấy lịch sử thay đổi tier
 */
const getTierHistory = async (userId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      mth.id, mth.reason, mth.total_spend_at, mth.changed_at,
      old_t.name AS old_tier_name, old_t.color_hex AS old_color,
      new_t.name AS new_tier_name, new_t.color_hex AS new_color
    FROM membership_tier_history mth
    LEFT JOIN membership_tiers old_t ON old_t.id = mth.old_tier_id
    JOIN membership_tiers new_t ON new_t.id = mth.new_tier_id
    WHERE mth.user_id = ?
    ORDER BY mth.changed_at DESC
    LIMIT 50
    `,
    [userId]
  );

  return rows;
};

/**
 * Lấy lịch sử sử dụng benefit
 */
const getBenefitUsage = async (userId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      mbu.id, mbu.benefit_key, mbu.used_at,
      b.booking_code
    FROM membership_benefit_usage mbu
    LEFT JOIN bookings b ON b.id = mbu.booking_id
    WHERE mbu.user_id = ?
    ORDER BY mbu.used_at DESC
    LIMIT 50
    `,
    [userId]
  );

  return rows;
};

/**
 * Tính membership discount cho booking
 * Gọi từ bookingService trước khi tính tổng tiền
 */
const calculateMembershipDiscount = async (userId, ticketTotal) => {
  const [rows] = await pool.execute(
    `
    SELECT mt.discount_percent
    FROM user_memberships um
    JOIN membership_tiers mt ON mt.id = um.tier_id
    WHERE um.user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  if (!rows[0] || rows[0].discount_percent === 0) {
    return { discount_percent: 0, discount_amount: 0 };
  }

  const discountPercent = rows[0].discount_percent;
  const discountAmount = Math.round((ticketTotal * discountPercent) / 100);

  return { discount_percent: discountPercent, discount_amount: discountAmount };
};

/**
 * Sử dụng điểm thưởng — 1 điểm = 1,000 VNĐ
 */
const usePoints = async (userId, pointsToUse, db = pool) => {
  if (pointsToUse <= 0) return 0;

  const [rows] = await db.execute(
    `SELECT points, points_used FROM user_memberships WHERE user_id = ? LIMIT 1`,
    [userId]
  );

  if (!rows[0]) {
    throw new AppError("Membership not found", 404);
  }

  const available = rows[0].points - rows[0].points_used;
  if (pointsToUse > available) {
    throw new AppError(`Không đủ điểm. Bạn có ${available} điểm khả dụng`, 400);
  }

  // 1 điểm = 1,000 VNĐ
  const discountFromPoints = pointsToUse * 1000;

  await db.execute(
    `UPDATE user_memberships SET points_used = points_used + ? WHERE user_id = ?`,
    [pointsToUse, userId]
  );

  return discountFromPoints;
};

const refundUsedPoints = async (connection, userId, pointsToRefund) => {
  const refund = Math.floor(Number(pointsToRefund || 0));
  if (refund <= 0) return 0;

  await connection.execute(
    `
    UPDATE user_memberships
    SET points_used = GREATEST(points_used - ?, 0)
    WHERE user_id = ?
    `,
    [refund, userId]
  );

  return refund;
};

/**
 * Ghi nhận sử dụng benefit
 */
const recordBenefitUsage = async (userId, benefitKey, bookingId = null) => {
  await pool.execute(
    `INSERT INTO membership_benefit_usage (user_id, benefit_key, booking_id) VALUES (?, ?, ?)`,
    [userId, benefitKey, bookingId]
  );
};

const consumeFreePopcornBenefit = async (connection, userId, bookingId) => {
  const [benefitRows] = await connection.execute(
    `
    SELECT mb.id
    FROM user_memberships um
    JOIN membership_benefits mb ON mb.tier_id = um.tier_id
    WHERE um.user_id = ?
      AND mb.benefit_key = 'FREE_POPCORN'
    LIMIT 1
    `,
    [userId]
  );

  if (!benefitRows[0]) {
    throw new AppError("Bạn chưa có ưu đãi bỏng ngô miễn phí", 400);
  }

  const [usageRows] = await connection.execute(
    `
    SELECT id
    FROM membership_benefit_usage
    WHERE user_id = ?
      AND benefit_key = 'FREE_POPCORN'
      AND MONTH(used_at) = MONTH(CURRENT_DATE())
      AND YEAR(used_at) = YEAR(CURRENT_DATE())
    LIMIT 1
    `,
    [userId]
  );

  if (usageRows[0]) {
    throw new AppError("Ưu đãi bỏng ngô miễn phí đã được sử dụng trong tháng này", 400);
  }

  await connection.execute(
    "INSERT INTO membership_benefit_usage (user_id, benefit_key, booking_id) VALUES (?, 'FREE_POPCORN', ?)",
    [userId, bookingId]
  );
};

const getUserVouchers = async (userId) => {
  await ensureVoucherTables();
  const [rows] = await pool.execute(
    `
    SELECT id, code, discount_amount, points_cost, status, created_at
    FROM user_vouchers
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
    `,
    [userId]
  );

  return rows;
};

const exchangePointsForVoucher = async (userId, discountAmount) => {
  const normalizedDiscount = Number(discountAmount);
  const pointsCost = VOUCHER_OPTIONS[normalizedDiscount];
  if (!pointsCost) {
    throw new AppError("Invalid voucher value", 400);
  }

  await ensureVoucherTables();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await usePoints(userId, pointsCost, connection);

    let code = generateVoucherCode();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [existing] = await connection.execute(
        "SELECT id FROM promotions WHERE code = ? LIMIT 1",
        [code]
      );
      if (!existing[0]) break;
      code = generateVoucherCode();
    }

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30);
    const expireDateKey = expireDate.toISOString().slice(0, 10);

    const [promotionResult] = await connection.execute(
      `
      INSERT INTO promotions(code, name, discount_type, discount_value, min_amount, expire_date, is_active)
      VALUES (?, ?, 'FIXED', ?, 0, ?, TRUE)
      `,
      [code, `VIP voucher ${normalizedDiscount}`, normalizedDiscount, expireDateKey]
    );

    const [voucherResult] = await connection.execute(
      `
      INSERT INTO user_vouchers(user_id, promotion_id, code, discount_amount, points_cost)
      VALUES (?, ?, ?, ?, ?)
      `,
      [userId, promotionResult.insertId, code, normalizedDiscount, pointsCost]
    );

    await connection.commit();
    return {
      id: voucherResult.insertId,
      code,
      discount_amount: normalizedDiscount,
      points_cost: pointsCost,
      status: "AVAILABLE",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const reserveUserVoucher = async (connection, userId, promotionId, bookingId) => {
  const [rows] = await connection.execute(
    `
    SELECT id, user_id, status
    FROM user_vouchers
    WHERE promotion_id = ?
    LIMIT 1
    FOR UPDATE
    `,
    [promotionId]
  );

  if (!rows[0]) {
    return { is_user_voucher: false, reserved: false };
  }

  if (Number(rows[0].user_id) !== Number(userId)) {
    throw new AppError("Voucher does not belong to this user", 403);
  }

  if (rows[0].status !== "AVAILABLE") {
    throw new AppError("Voucher has already been used", 400);
  }

  await connection.execute(
    `
    UPDATE user_vouchers
    SET status = 'RESERVED', booking_id = ?, reserved_at = NOW()
    WHERE id = ?
    `,
    [bookingId, rows[0].id]
  );
  await connection.execute("UPDATE promotions SET is_active = FALSE WHERE id = ?", [promotionId]);
  return { is_user_voucher: true, reserved: true };
};

const finalizeBookingVouchers = async (connection, bookingId) => {
  const [rows] = await connection.execute(
    `
    SELECT uv.id, uv.promotion_id
    FROM user_vouchers uv
    WHERE uv.booking_id = ?
      AND uv.status = 'RESERVED'
    FOR UPDATE
    `,
    [bookingId]
  );

  for (const voucher of rows) {
    await connection.execute("UPDATE user_vouchers SET status = 'USED' WHERE id = ?", [voucher.id]);
    await connection.execute("UPDATE promotions SET is_active = FALSE WHERE id = ?", [voucher.promotion_id]);
  }
};

const restoreBookingVouchers = async (connection, bookingId) => {
  const [rows] = await connection.execute(
    `
    SELECT id, promotion_id
    FROM user_vouchers
    WHERE booking_id = ?
      AND status = 'RESERVED'
    FOR UPDATE
    `,
    [bookingId]
  );

  for (const voucher of rows) {
    await connection.execute(
      `
      UPDATE user_vouchers
      SET status = 'AVAILABLE', booking_id = NULL, reserved_at = NULL
      WHERE id = ?
      `,
      [voucher.id]
    );
    await connection.execute("UPDATE promotions SET is_active = TRUE WHERE id = ?", [
      voucher.promotion_id,
    ]);
  }
};

const restoreBookingBenefits = async (connection, bookingId) => {
  await connection.execute(
    `
    DELETE FROM membership_benefit_usage
    WHERE booking_id = ?
      AND benefit_key IN ('FREE_POPCORN', 'FREE_COMBO', 'FREE_UPGRADE_SEAT', 'BIRTHDAY_GIFT', 'LOUNGE_ACCESS')
    `,
    [bookingId]
  );
};

const awardCancellationRefundPoints = async (connection, bookingId) => {
  const [bookingRows] = await connection.execute(
    `
    SELECT b.id, b.user_id, b.total_amount, b.points_used
    FROM bookings b
    JOIN user_memberships um ON um.user_id = b.user_id
    WHERE b.id = ?
    LIMIT 1
    FOR UPDATE
    `,
    [bookingId]
  );

  const booking = bookingRows[0];
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  const bookingPointsUsed = Number(booking.points_used || 0);
  if (bookingPointsUsed > 0) {
    const refundedPoints = await refundUsedPoints(connection, booking.user_id, bookingPointsUsed);
    await restoreBookingVouchers(connection, bookingId);
    await restoreBookingBenefits(connection, bookingId);
    await connection.execute(
      "UPDATE payments SET payment_status = 'FAILED' WHERE booking_id = ? AND payment_status IN ('PENDING', 'SUCCESS')",
      [bookingId]
    );
    return { points_refunded: refundedPoints, refund_amount: 0 };
  }

  const [paymentRows] = await connection.execute(
    `
    SELECT amount
    FROM payments
    WHERE booking_id = ?
      AND payment_status IN ('PENDING', 'SUCCESS')
    ORDER BY id DESC
    LIMIT 1
    FOR UPDATE
    `,
    [bookingId]
  );

  const refundAmount = Number(paymentRows[0]?.amount ?? booking.total_amount ?? 0);
  const refundPoints = Math.floor(refundAmount / 1000);

  if (refundPoints <= 0) {
    await connection.execute(
      `
      UPDATE payments
      SET payment_status = 'FAILED'
      WHERE booking_id = ?
        AND payment_status IN ('PENDING', 'SUCCESS')
      `,
      [bookingId]
    );
    await restoreBookingVouchers(connection, bookingId);
    await restoreBookingBenefits(connection, bookingId);
    return { points_refunded: 0, refund_amount: refundAmount };
  }

  await connection.execute(
    `
    UPDATE user_memberships
    SET points = points + ?
    WHERE user_id = ?
    `,
    [refundPoints, booking.user_id]
  );

  await connection.execute(
    `
    UPDATE payments
    SET payment_status = 'FAILED'
    WHERE booking_id = ?
      AND payment_status IN ('PENDING', 'SUCCESS')
    `,
    [bookingId]
  );

  await restoreBookingVouchers(connection, bookingId);
  await restoreBookingBenefits(connection, bookingId);

  return { points_refunded: refundPoints, refund_amount: refundAmount };
};

const awardBookingRewards = async (connection, bookingId) => {
  const [bookingRows] = await connection.execute(
    `
    SELECT b.id, b.user_id, b.total_amount, b.points_earned, b.points_used,
           um.tier_id AS old_tier_id, um.total_spend
    FROM bookings b
    JOIN user_memberships um ON um.user_id = b.user_id
    WHERE b.id = ?
    LIMIT 1
    FOR UPDATE
    `,
    [bookingId]
  );

  const booking = bookingRows[0];
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (Number(booking.points_earned || 0) > 0) {
    return {
      points_earned: Number(booking.points_earned),
      total_spend: Number(booking.total_spend || 0),
      tier_id: booking.old_tier_id,
    };
  }

  if (Number(booking.points_used || 0) > 0) {
    await finalizeBookingVouchers(connection, bookingId);
    return {
      points_earned: 0,
      total_spend: Number(booking.total_spend || 0),
      tier_id: booking.old_tier_id,
    };
  }

  const bookingTotal = Number(booking.total_amount || 0);
  const totalSpend = Number(booking.total_spend || 0) + bookingTotal;

  const [tierRows] = await connection.execute(
    `
    SELECT id, point_multiplier
    FROM membership_tiers
    WHERE min_spend <= ?
      AND (max_spend IS NULL OR max_spend >= ?)
    ORDER BY tier_level DESC
    LIMIT 1
    `,
    [totalSpend, totalSpend]
  );

  const newTier = tierRows[0] || { id: booking.old_tier_id, point_multiplier: 1 };
  const pointsEarned = Math.floor((bookingTotal / 10000) * Number(newTier.point_multiplier || 1));

  await connection.execute(
    `
    UPDATE user_memberships
    SET total_spend = ?,
        tier_id = ?,
        points = points + ?,
        tier_updated_at = CASE WHEN tier_id <> ? THEN NOW() ELSE tier_updated_at END
    WHERE user_id = ?
    `,
    [totalSpend, newTier.id, pointsEarned, newTier.id, booking.user_id]
  );

  if (Number(booking.old_tier_id) !== Number(newTier.id)) {
    await connection.execute(
      `
      INSERT INTO membership_tier_history
        (user_id, old_tier_id, new_tier_id, reason, total_spend_at)
      VALUES (?, ?, ?, 'UPGRADE', ?)
      `,
      [booking.user_id, booking.old_tier_id, newTier.id, totalSpend]
    );
  }

  await connection.execute(
    "UPDATE bookings SET points_earned = ? WHERE id = ?",
    [pointsEarned, bookingId]
  );

  await finalizeBookingVouchers(connection, bookingId);

  return { points_earned: pointsEarned, total_spend: totalSpend, tier_id: newTier.id };
};

module.exports = {
  getMembership,
  getAllTiers,
  getTierHistory,
  getBenefitUsage,
  calculateMembershipDiscount,
  usePoints,
  refundUsedPoints,
  recordBenefitUsage,
  consumeFreePopcornBenefit,
  getUserVouchers,
  exchangePointsForVoucher,
  reserveUserVoucher,
  finalizeBookingVouchers,
  restoreBookingVouchers,
  restoreBookingBenefits,
  awardCancellationRefundPoints,
  awardBookingRewards,
};
