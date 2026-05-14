const pool = require("../configs/db");

const getSeatsByShowtime = async (showtimeId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      se.id, se.room_id, se.seat_row, se.seat_number, se.seat_type,
      ssp.price,
      CASE WHEN COUNT(b.id) = 0 THEN FALSE ELSE TRUE END AS is_booked
    FROM showtimes st
    JOIN seats se ON se.room_id = st.room_id
    LEFT JOIN showtime_seat_prices ssp
      ON ssp.showtime_id = st.id AND ssp.seat_type = se.seat_type
    LEFT JOIN booking_seats bs ON bs.seat_id = se.id
    LEFT JOIN bookings b
      ON b.id = bs.booking_id
      AND b.showtime_id = st.id
      AND b.booking_status IN ('PENDING', 'CONFIRMED')
    WHERE st.id = ?
    GROUP BY se.id, se.room_id, se.seat_row, se.seat_number, se.seat_type, ssp.price
    ORDER BY se.seat_row, se.seat_number
    `,
    [showtimeId]
  );

  return rows;
};

const getSeatsByRoom = async (roomId) => {
  const [rows] = await pool.execute(
    `
    SELECT id, room_id, seat_row, seat_number, seat_type
    FROM seats
    WHERE room_id = ?
    ORDER BY seat_row, seat_number
    `,
    [roomId]
  );

  return rows;
};

module.exports = {
  getSeatsByShowtime,
  getSeatsByRoom,
};
