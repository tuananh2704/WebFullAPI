const pool = require("../configs/db");
const AppError = require("../utils/AppError");
const membershipService = require("./membershipService");
const promotionService = require("./promotionService");

const generateBookingCode = () => `BK${Date.now()}`;

const isTuesdayDate = (dateKey) => {
  return new Date(`${dateKey}T00:00:00`).getDay() === 2;
};

const getMinimumAge = (ageRating) => {
  const normalized = String(ageRating || "P").toUpperCase();
  if (normalized === "P" || normalized === "K") return 0;
  const match = normalized.match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const getAge = (birthDate, atDate = new Date()) => {
  if (!birthDate) return null;
  const birth = new Date(`${String(birthDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  let age = atDate.getFullYear() - birth.getFullYear();
  const monthDiff = atDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && atDate.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
};

const getShowtimeMeta = async (connection, showtimeId) => {
  const [rows] = await connection.execute(
    `
    SELECT
      DATE_FORMAT(COALESCE(st.show_date, DATE(st.start_time)), '%Y-%m-%d') AS show_date,
      COALESCE(m.age_rating, 'P') AS age_rating,
      m.title AS movie_title
    FROM showtimes st
    JOIN movies m ON m.id = st.movie_id
    WHERE st.id = ?
    LIMIT 1
    `,
    [showtimeId]
  );

  return rows[0] || null;
};

const getTodayDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getUserBirthDate = async (connection, userId) => {
  const [rows] = await connection.execute(
    "SELECT birth_date FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  return rows[0]?.birth_date || null;
};

const getSeatPrices = async (connection, showtimeId, seatIds) => {
  const placeholders = seatIds.map(() => "?").join(",");
  const [rows] = await connection.execute(
    `
    SELECT
      se.id AS seat_id,
      se.seat_type,
      COALESCE(
        ssp.price,
        CASE
          WHEN r.room_type = '2D' AND se.seat_type = 'NORMAL' THEN 75000
          WHEN r.room_type = '2D' AND se.seat_type = 'VIP' THEN 110000
          WHEN r.room_type = '2D' AND se.seat_type = 'COUPLE' THEN 190000
          WHEN r.room_type = '3D' AND se.seat_type = 'NORMAL' THEN 90000
          WHEN r.room_type = '3D' AND se.seat_type = 'VIP' THEN 130000
          WHEN r.room_type = '3D' AND se.seat_type = 'COUPLE' THEN 220000
          WHEN r.room_type = 'IMAX' AND se.seat_type = 'NORMAL' THEN 120000
          WHEN r.room_type = 'IMAX' AND se.seat_type = 'VIP' THEN 160000
          WHEN r.room_type = 'IMAX' AND se.seat_type = 'COUPLE' THEN 280000
          WHEN r.room_type = '4DX' AND se.seat_type = 'NORMAL' THEN 130000
          WHEN r.room_type = '4DX' AND se.seat_type = 'VIP' THEN 170000
          WHEN r.room_type = '4DX' AND se.seat_type = 'COUPLE' THEN 300000
          ELSE 75000
        END
      ) AS price
    FROM showtimes st
    JOIN rooms r ON r.id = st.room_id
    JOIN seats se ON se.room_id = st.room_id
    LEFT JOIN showtime_seat_prices ssp
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

const createBooking = async ({
  userId,
  showtime_id,
  seat_ids,
  foods = [],
  points_to_use = 0,
  promotion_code = "",
  use_free_popcorn = false,
}) => {
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

    const showtimeMeta = await getShowtimeMeta(connection, showtime_id);
    if (!showtimeMeta) {
      throw new AppError("Invalid showtime", 400);
    }

    if (showtimeMeta.show_date < getTodayDateKey()) {
      throw new AppError("Khong the dat ve cho ngay da qua", 400);
    }

    const userAge = getAge(await getUserBirthDate(connection, userId));
    const minimumAge = getMinimumAge(showtimeMeta.age_rating);
    if (minimumAge > 0 && userAge !== null && userAge < minimumAge) {
      throw new AppError(
        `Bạn chưa đủ ${minimumAge} tuổi để đặt vé phim ${showtimeMeta.age_rating}.`,
        403
      );
    }

    const ticketTotal = seatPrices.reduce((sum, seat) => sum + Number(seat.price), 0);
    let foodTotal = 0;
    const showtimeDate = showtimeMeta.show_date;
    const tuesdayDiscount =
      showtimeDate && isTuesdayDate(showtimeDate) ? Math.round(ticketTotal * 0.5) : 0;

    // Áp membership discount lên giá vé
    const { discount_amount: membershipDiscount } =
      await membershipService.calculateMembershipDiscount(userId, ticketTotal);

    let totalAmount = Math.max(ticketTotal - membershipDiscount - tuesdayDiscount, 0);
    let pointsUsed = 0;
    let freePopcornDiscount = 0;

    const [bookingResult] = await connection.execute(
      `
      INSERT INTO bookings(user_id, showtime_id, booking_code, total_amount, membership_discount, booking_status)
      VALUES (?, ?, ?, ?, ?, 'PENDING')
      `,
      [userId, showtime_id, generateBookingCode(), totalAmount, membershipDiscount]
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
        SELECT fs.price, f.name AS food_name
        FROM food_sizes fs
        JOIN foods f ON f.id = fs.food_id
        WHERE fs.food_id = ? AND fs.size_name = ?
        LIMIT 1
        `,
        [food.food_id, food.size_name]
      );

      if (!foodRows[0]) {
        throw new AppError("Invalid food size", 400);
      }

      const quantity = Number(food.quantity || 1);
      const unitPrice = Number(foodRows[0].price);
      const foodLineTotal = quantity * unitPrice;
      foodTotal += foodLineTotal;
      totalAmount += foodLineTotal;

      if (
        use_free_popcorn &&
        freePopcornDiscount === 0 &&
        quantity > 0 &&
        /^combo\s*1$/i.test(String(foodRows[0].food_name || "").trim())
      ) {
        freePopcornDiscount = unitPrice;
      }

      await connection.execute(
        `
        INSERT INTO booking_foods(booking_id, food_id, size_name, quantity, unit_price)
        VALUES (?, ?, ?, ?, ?)
        `,
        [bookingId, food.food_id, food.size_name, quantity, unitPrice]
      );
    }

    if (use_free_popcorn) {
      if (freePopcornDiscount <= 0) {
        throw new AppError("Chọn Combo 1 để sử dụng ưu đãi bỏng ngô miễn phí", 400);
      }
      await membershipService.consumeFreePopcornBenefit(connection, userId, bookingId);
      totalAmount = Math.max(totalAmount - freePopcornDiscount, 0);
    }

    const normalizedPromotionCode = String(promotion_code || "").trim();
    if (normalizedPromotionCode) {
      const promotionResult = await promotionService.applyPromotionCode({
        code: normalizedPromotionCode,
        total_amount: ticketTotal + foodTotal,
      });
      const promotionDiscount = Math.round(Number(promotionResult.discount_amount || 0));
      totalAmount = Math.max(totalAmount - promotionDiscount, 0);

      if (promotionResult.promotion?.id) {
        await connection.execute(
          `
          INSERT INTO booking_promotions(booking_id, promotion_id, discount_amount)
          VALUES (?, ?, ?)
          `,
          [bookingId, promotionResult.promotion.id, promotionDiscount]
        );
        await membershipService.reserveUserVoucher(
          connection,
          userId,
          promotionResult.promotion.id,
          bookingId
        );
      }
    }

    const requestedPoints = Math.floor(Number(points_to_use || 0));
    if (requestedPoints > 0) {
      const pointsNeeded = Math.ceil(totalAmount / 1000);
      if (requestedPoints < pointsNeeded) {
        throw new AppError(`Can toi thieu ${pointsNeeded} diem de thanh toan bang diem VIP`, 400);
      }

      const pointDiscount = await membershipService.usePoints(userId, pointsNeeded, connection);
      totalAmount = Math.max(totalAmount - pointDiscount, 0);
      pointsUsed = pointsNeeded;
    }

    await connection.execute(
      "UPDATE bookings SET total_amount = ?, points_used = ? WHERE id = ?",
      [totalAmount, pointsUsed, bookingId]
    );

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
      b.showtime_id, s.movie_id, s.start_time, s.end_time, m.title AS movie_title, m.poster_url
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
      b.id, b.user_id, b.showtime_id, b.booking_code, b.total_amount,
      b.membership_discount, b.points_earned, b.points_used, b.booking_status,
      s.movie_id, s.start_time, s.end_time, m.title AS movie_title, r.name AS room_name, c.name AS cinema_name
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
    SELECT id, payment_method, amount, payment_status, transfer_content
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
