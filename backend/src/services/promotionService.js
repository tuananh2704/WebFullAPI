const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const applyPromotionCode = async ({ code, total_amount }) => {
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

  if (!promotion.is_active) {
    throw new AppError("Promotion code is not active", 400);
  }

  if (Number(promotion.min_amount || 0) > total) {
    throw new AppError(`Promotion requires minimum amount ${promotion.min_amount}`, 400);
  }

  if (promotion.expire_date) {
    const expireDate = new Date(promotion.expire_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expireDate < today) {
      throw new AppError("Promotion code has expired", 400);
    }
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
