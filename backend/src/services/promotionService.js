const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const applyPromotionCode = async ({ code, total_amount }) => {
  const [rows] = await pool.execute(
    "SELECT id, code, name, discount_type, discount_value FROM promotions WHERE code = ? LIMIT 1",
    [code]
  );

  if (!rows[0]) {
    throw new AppError("Promotion code is invalid", 404);
  }

  const promotion = rows[0];
  const total = Number(total_amount || 0);
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
