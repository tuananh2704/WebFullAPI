USE cinema_booking;

CREATE TABLE IF NOT EXISTS user_vouchers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  promotion_id BIGINT NOT NULL,
  code VARCHAR(50) NOT NULL,
  discount_amount INT NOT NULL,
  points_cost INT NOT NULL,
  status ENUM('AVAILABLE','RESERVED','USED') NOT NULL DEFAULT 'AVAILABLE',
  booking_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reserved_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_vouchers_promotion ON user_vouchers(promotion_id);
CREATE INDEX idx_user_vouchers_code ON user_vouchers(code);

ALTER TABLE user_vouchers
  MODIFY status ENUM('AVAILABLE','RESERVED','USED') NOT NULL DEFAULT 'AVAILABLE';
