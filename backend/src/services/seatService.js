const pool = require("../configs/db");

const getSeatsByShowtime = async (showtimeId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      se.id, se.room_id, se.seat_row, se.seat_number, se.seat_type,
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
      ) AS price,
      CASE WHEN COUNT(b.id) = 0 THEN FALSE ELSE TRUE END AS is_booked
    FROM showtimes st
    JOIN rooms r ON r.id = st.room_id
    JOIN seats se ON se.room_id = st.room_id
    LEFT JOIN showtime_seat_prices ssp
      ON ssp.showtime_id = st.id AND ssp.seat_type = se.seat_type
    LEFT JOIN booking_seats bs ON bs.seat_id = se.id
    LEFT JOIN bookings b
      ON b.id = bs.booking_id
      AND b.showtime_id = st.id
      AND b.booking_status IN ('PENDING', 'CONFIRMED')
    WHERE st.id = ?
    GROUP BY se.id, se.room_id, se.seat_row, se.seat_number, se.seat_type, r.room_type, ssp.price
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
