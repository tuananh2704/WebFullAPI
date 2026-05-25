const pool = require("../configs/db");
const AppError = require("../utils/AppError");

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
    benefits: benefits.map((b) => ({
      ...b,
      used_this_month: usageMap[b.benefit_key] || 0,
    })),
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
const usePoints = async (userId, pointsToUse) => {
  if (pointsToUse <= 0) return 0;

  const [rows] = await pool.execute(
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

  await pool.execute(
    `UPDATE user_memberships SET points_used = points_used + ? WHERE user_id = ?`,
    [pointsToUse, userId]
  );

  return discountFromPoints;
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

const awardBookingRewards = async (connection, bookingId) => {
  const [bookingRows] = await connection.execute(
    `
    SELECT b.id, b.user_id, b.total_amount, b.points_earned,
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

  return { points_earned: pointsEarned, total_spend: totalSpend, tier_id: newTier.id };
};

module.exports = {
  getMembership,
  getAllTiers,
  getTierHistory,
  getBenefitUsage,
  calculateMembershipDiscount,
  usePoints,
  recordBenefitUsage,
  awardBookingRewards,
};
