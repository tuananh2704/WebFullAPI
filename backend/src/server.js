const app = require("./app");
const pool = require("./configs/db");
require("dotenv").config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => {
      console.log(`Cinema Booking API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Cannot connect to MySQL database:", error.message);
    process.exit(1);
  }
};

startServer();
