const pool = require("../configs/db");

const getFoods = async () => {
  const [rows] = await pool.execute(
    `
    SELECT f.id, f.category_id, fc.name AS category_name, f.name, f.description, f.image_url
    FROM foods f
    LEFT JOIN food_categories fc ON fc.id = f.category_id
    ORDER BY f.id ASC
    `
  );

  return rows;
};

const getFoodSizes = async (foodId) => {
  const params = [];
  let whereSql = "";

  if (foodId) {
    whereSql = "WHERE fs.food_id = ?";
    params.push(foodId);
  }

  const [rows] = await pool.execute(
    `
    SELECT fs.id, fs.food_id, f.name AS food_name, fs.size_name, fs.price
    FROM food_sizes fs
    JOIN foods f ON f.id = fs.food_id
    ${whereSql}
    ORDER BY fs.food_id ASC, fs.size_name ASC
    `,
    params
  );

  return rows;
};

module.exports = {
  getFoods,
  getFoodSizes,
};
