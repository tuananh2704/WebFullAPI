const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const applyPromotionCode = async ({ code, total_amount, userId }) => {
  const [rows] = await pool.execute(
    `
    SELECT id, code, name, discount_type, discount_value, min_amount, expire_date, is_active
    FROM promotions
    WHERE code = ?
    LIMIT 1
    `,
    [code]
  );

  if (!rows[0]) {
    throw new AppError("Promotion code is invalid", 404);
  }

  const promotion = rows[0];
  const total = Number(total_amount || 0);

  let voucherRows = [];
  let hasVoucherRows = false;
  try {
    const [anyVoucherRows] = await pool.execute(
      "SELECT id FROM user_vouchers WHERE promotion_id = ? LIMIT 1",
      [promotion.id]
    );
    hasVoucherRows = Boolean(anyVoucherRows[0]);

    if (userId) {
      [voucherRows] = await pool.execute(
        `
        SELECT
          uv.id, uv.user_id, uv.status, uv.expires_at, uv.target_tier_id,
          um.tier_id AS user_tier_id
        FROM user_vouchers uv
        LEFT JOIN user_memberships um ON um.user_id = uv.user_id
        WHERE uv.promotion_id = ?
          AND uv.user_id = ?
        LIMIT 1
        `,
        [promotion.id, userId]
      );
    } else if (hasVoucherRows) {
      throw new AppError("Bạn cần đăng nhập để dùng voucher này.", 401);
    }
  } catch (error) {
    if (error.code !== "ER_NO_SUCH_TABLE") {
      throw error;
    }
  }
  const userVoucher = voucherRows[0];

  if (userVoucher) {
    const [usedBookingRows] = await pool.execute(
      `
      SELECT b.id
      FROM booking_promotions bp
      JOIN bookings b ON b.id = bp.booking_id
      WHERE bp.promotion_id = ?
        AND b.user_id = ?
        AND b.booking_status IN ('PENDING', 'CONFIRMED')
      LIMIT 1
      `,
      [promotion.id, userId]
    );

    if (usedBookingRows[0]) {
      throw new AppError("Voucher đã được sử dụng.", 400);
    }

    if (userVoucher.status !== "AVAILABLE") {
      throw new AppError("Voucher đã được sử dụng.", 400);
    }

    if (userVoucher.expires_at && new Date(userVoucher.expires_at).getTime() < Date.now()) {
      throw new AppError("Voucher đã hết hạn.", 400);
    }

    if (
      userVoucher.target_tier_id &&
      Number(userVoucher.target_tier_id) !== Number(userVoucher.user_tier_id)
    ) {
      throw new AppError("Voucher này chỉ dùng cho đúng hạng VIP được gửi.", 403);
    }
  } else if (hasVoucherRows) {
    throw new AppError("Voucher không thuộc tài khoản này.", 403);
  } else if (!promotion.is_active) {
    throw new AppError("Promotion code is not active", 400);
  }

  if (promotion.expire_date) {
    const expireDate = new Date(promotion.expire_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expireDate < today) {
      throw new AppError("Promotion code has expired", 400);
    }
  }

  if (Number(promotion.min_amount || 0) > total) {
    throw new AppError(`Promotion requires minimum amount ${promotion.min_amount}`, 400);
  }

  const discountAmount =
    promotion.discount_type === "PERCENT"
      ? Math.min(total, (total * Number(promotion.discount_value)) / 100)
      : Math.min(total, Number(promotion.discount_value));

  return {
    promotion,
    discount_amount: discountAmount,
    final_amount: total - discountAmount,
  };
};

module.exports = {
  applyPromotionCode,
};
