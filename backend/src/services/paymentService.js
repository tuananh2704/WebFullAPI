const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const createPayment = async ({ booking_id, payment_method, amount, transfer_content }) => {
  // Bank transfer is verified manually by admin, so it remains pending.
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [bookingRows] = await connection.execute(
      "SELECT id, total_amount FROM bookings WHERE id = ? LIMIT 1",
      [booking_id]
    );

    if (!bookingRows[0]) {
      throw new AppError("Booking not found", 404);
    }

    const paymentAmount = amount ?? bookingRows[0].total_amount;

    // BANK_TRANSFER: keep payment as PENDING, don't auto-confirm booking
    // Other methods: auto SUCCESS + confirm booking
    const isBankTransfer = payment_method === "BANK_TRANSFER";
    const requiresManualReview = isBankTransfer || Number(paymentAmount) === 0;
    const paymentStatus = requiresManualReview ? "PENDING" : "SUCCESS";

    const [result] = await connection.execute(
      `
      INSERT INTO payments(booking_id, payment_method, amount, payment_status, transfer_content)
      VALUES (?, ?, ?, ?, ?)
      `,
      [booking_id, payment_method, paymentAmount, paymentStatus, transfer_content || null]
    );

    // Only auto-confirm booking for non-bank-transfer methods
    if (!requiresManualReview) {
      await connection.execute(
        "UPDATE bookings SET booking_status = 'CONFIRMED' WHERE id = ?",
        [booking_id]
      );
    }

    await connection.commit();

    const [rows] = await pool.execute("SELECT * FROM payments WHERE id = ?", [result.insertId]);
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createPayment,
};
