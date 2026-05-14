const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const generateBookingCode = () => `BK${Date.now()}`;

const getSeatPrices = async (connection, showtimeId, seatIds) => {
  const placeholders = seatIds.map(() => "?").join(",");
  const [rows] = await connection.execute(
    `
    SELECT se.id AS seat_id, se.seat_type, ssp.price
    FROM showtimes st
    JOIN seats se ON se.room_id = st.room_id
    JOIN showtime_seat_prices ssp
      ON ssp.showtime_id = st.id AND ssp.seat_type = se.seat_type
    WHERE st.id = ? AND se.id IN (${placeholders})
    `,
    [showtimeId, ...seatIds]
  );

  return rows;
};

const findBookedSeats = async (connection, showtimeId, seatIds) => {
  const placeholders = seatIds.map(() => "?").join(",");
  const [rows] = await connection.execute(
    `
    SELECT bs.seat_id
    FROM booking_seats bs
    JOIN bookings b ON b.id = bs.booking_id
    WHERE b.showtime_id = ?
      AND b.booking_status IN ('PENDING', 'CONFIRMED')
      AND bs.seat_id IN (${placeholders})
    `,
    [showtimeId, ...seatIds]
  );

  return rows;
};

const createBooking = async ({ userId, showtime_id, seat_ids, foods = [] }) => {
  if (!seat_ids?.length) {
    throw new AppError("seat_ids is required", 400);
  }

  // Booking touches multiple tables, so a transaction prevents partial bookings.
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Re-check selected seats right before insert to avoid double booking.
    const bookedSeats = await findBookedSeats(connection, showtime_id, seat_ids);
    if (bookedSeats.length > 0) {
      throw new AppError("Some seats are already booked", 409);
    }

    const seatPrices = await getSeatPrices(connection, showtime_id, seat_ids);
    if (seatPrices.length !== seat_ids.length) {
      throw new AppError("Invalid seat selection for this showtime", 400);
    }

    let totalAmount = seatPrices.reduce((sum, seat) => sum + Number(seat.price), 0);

    const [bookingResult] = await connection.execute(
      `
      INSERT INTO bookings(user_id, showtime_id, booking_code, total_amount, booking_status)
      VALUES (?, ?, ?, ?, 'PENDING')
      `,
      [userId, showtime_id, generateBookingCode(), totalAmount]
    );

    const bookingId = bookingResult.insertId;

    for (const seat of seatPrices) {
      await connection.execute(
        "INSERT INTO booking_seats(booking_id, seat_id, price) VALUES (?, ?, ?)",
        [bookingId, seat.seat_id, seat.price]
      );
    }

    for (const food of foods) {
      const [foodRows] = await connection.execute(
        `
        SELECT price FROM food_sizes
        WHERE food_id = ? AND size_name = ?
        LIMIT 1
        `,
        [food.food_id, food.size_name]
      );

      if (!foodRows[0]) {
        throw new AppError("Invalid food size", 400);
      }

      const quantity = Number(food.quantity || 1);
      const unitPrice = Number(foodRows[0].price);
      totalAmount += quantity * unitPrice;

      await connection.execute(
        `
        INSERT INTO booking_foods(booking_id, food_id, size_name, quantity, unit_price)
        VALUES (?, ?, ?, ?, ?)
        `,
        [bookingId, food.food_id, food.size_name, quantity, unitPrice]
      );
    }

    await connection.execute("UPDATE bookings SET total_amount = ? WHERE id = ?", [
      totalAmount,
      bookingId,
    ]);

    await connection.commit();
    return getBookingDetail(bookingId, userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getBookingHistory = async (userId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      b.id, b.booking_code, b.total_amount, b.booking_status,
      b.showtime_id, s.start_time, m.title AS movie_title, m.poster_url
    FROM bookings b
    JOIN showtimes s ON s.id = b.showtime_id
    JOIN movies m ON m.id = s.movie_id
    WHERE b.user_id = ?
    ORDER BY b.id DESC
    `,
    [userId]
  );

  return rows;
};

const getBookingDetail = async (bookingId, userId, isAdmin = false) => {
  const params = isAdmin ? [bookingId] : [bookingId, userId];
  const userFilter = isAdmin ? "" : "AND b.user_id = ?";

  const [bookingRows] = await pool.execute(
    `
    SELECT
      b.id, b.user_id, b.showtime_id, b.booking_code, b.total_amount, b.booking_status,
      s.start_time, s.end_time, m.title AS movie_title, r.name AS room_name, c.name AS cinema_name
    FROM bookings b
    JOIN showtimes s ON s.id = b.showtime_id
    JOIN movies m ON m.id = s.movie_id
    JOIN rooms r ON r.id = s.room_id
    JOIN cinemas c ON c.id = r.cinema_id
    WHERE b.id = ? ${userFilter}
    LIMIT 1
    `,
    params
  );

  if (!bookingRows[0]) {
    throw new AppError("Booking not found", 404);
  }

  const [seats] = await pool.execute(
    `
    SELECT se.id, se.seat_row, se.seat_number, se.seat_type, bs.price
    FROM booking_seats bs
    JOIN seats se ON se.id = bs.seat_id
    WHERE bs.booking_id = ?
    ORDER BY se.seat_row, se.seat_number
    `,
    [bookingId]
  );

  const [foods] = await pool.execute(
    `
    SELECT f.id, f.name, bf.size_name, bf.quantity, bf.unit_price
    FROM booking_foods bf
    JOIN foods f ON f.id = bf.food_id
    WHERE bf.booking_id = ?
    `,
    [bookingId]
  );

  const [payments] = await pool.execute(
    `
    SELECT id, payment_method, amount, payment_status
    FROM payments
    WHERE booking_id = ?
    `,
    [bookingId]
  );

  return {
    ...bookingRows[0],
    seats,
    foods,
    payments,
  };
};

module.exports = {
  createBooking,
  getBookingHistory,
  getBookingDetail,
};
