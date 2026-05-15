DROP DATABASE IF EXISTS cinema_booking;
CREATE DATABASE cinema_booking;
USE cinema_booking;

-- =====================================================
-- CINEMAS
-- =====================================================

CREATE TABLE cinemas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    description TEXT
);

INSERT INTO cinemas(name, address, phone, description)
VALUES
('CGV Vincom', 'Ha Noi', '0900000001', 'Cinema center'),
('Lotte Cinema', 'Ho Chi Minh', '0900000002', 'Modern cinema'),
('Galaxy Cinema', 'Da Nang', '0900000003', 'Family cinema');

-- =====================================================
-- ROOMS
-- =====================================================

CREATE TABLE rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cinema_id INT NOT NULL,
    name VARCHAR(50),
    room_type ENUM('2D', '3D', 'IMAX', '4DX') DEFAULT '2D',
    total_seats INT,

    FOREIGN KEY (cinema_id)
    REFERENCES cinemas(id)
    ON DELETE CASCADE
);

INSERT INTO rooms(cinema_id, name, room_type, total_seats)
VALUES
(1, 'Room A1', '2D', 50),
(1, 'Room A2', 'IMAX', 80),
(2, 'Room B1', '3D', 60),
(2, 'Room B2', '4DX', 70),
(3, 'Room C1', '2D', 40);

-- =====================================================
-- SEATS
-- =====================================================

CREATE TABLE seats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    seat_row CHAR(2),
    seat_number INT,
    seat_type ENUM('NORMAL', 'VIP', 'COUPLE') DEFAULT 'NORMAL',

    FOREIGN KEY (room_id)
    REFERENCES rooms(id)
    ON DELETE CASCADE
);

INSERT INTO seats(room_id, seat_row, seat_number, seat_type)
VALUES
(1, 'A', 1, 'NORMAL'),
(1, 'A', 2, 'NORMAL'),
(1, 'A', 3, 'VIP'),
(1, 'B', 1, 'NORMAL'),
(2, 'A', 1, 'COUPLE'),
(2, 'A', 2, 'COUPLE'),
(3, 'C', 1, 'VIP'),
(4, 'D', 1, 'NORMAL');

-- =====================================================
-- GENRES
-- =====================================================

CREATE TABLE genres (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100)
);

INSERT INTO genres(name)
VALUES
('Action'),
('Comedy'),
('Horror'),
('Sci-Fi'),
('Animation'),
('Drama'),
('Adventure');

-- =====================================================
-- MOVIES
-- =====================================================

CREATE TABLE movies (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255),
    description TEXT,
    duration INT,
    release_date DATE,
    poster_url VARCHAR(500),
    language VARCHAR(50),
    rating DECIMAL(3,1),
    status ENUM('COMING_SOON', 'NOW_SHOWING', 'ENDED') DEFAULT 'NOW_SHOWING'
);

INSERT INTO movies(title, description, duration, release_date, poster_url, language, rating, status)
VALUES
('Avengers Endgame', 'Marvel movie', 181, '2019-04-26', 'poster1.jpg', 'English', 9.2, 'NOW_SHOWING'),
('Spider Man', 'Hero movie', 148, '2021-12-17', 'poster2.jpg', 'English', 8.7, 'NOW_SHOWING'),
('Frozen 2', 'Disney animation', 120, '2019-11-20', 'poster3.jpg', 'English', 8.1, 'NOW_SHOWING'),
('Conjuring', 'Horror movie', 112, '2018-07-10', 'poster4.jpg', 'English', 7.9, 'NOW_SHOWING'),
('Interstellar', 'Space movie', 169, '2014-11-05', 'poster5.jpg', 'English', 9.0, 'NOW_SHOWING'),
('Your Name', 'Anime movie', 106, '2016-08-26', 'poster6.jpg', 'Japanese', 8.9, 'NOW_SHOWING'),
('Dune', 'Sci-fi movie', 155, '2021-10-22', 'poster7.jpg', 'English', 8.5, 'COMING_SOON');

-- =====================================================
-- MOVIE GENRES
-- =====================================================

CREATE TABLE movie_genres (
    movie_id BIGINT,
    genre_id INT,

    PRIMARY KEY(movie_id, genre_id),

    FOREIGN KEY (movie_id)
    REFERENCES movies(id)
    ON DELETE CASCADE,

    FOREIGN KEY (genre_id)
    REFERENCES genres(id)
    ON DELETE CASCADE
);

INSERT INTO movie_genres(movie_id, genre_id)
VALUES
(1,1),
(1,7),
(2,1),
(3,5),
(4,3),
(5,4),
(6,6),
(7,4);

-- =====================================================
-- SHOWTIMES
-- =====================================================

CREATE TABLE showtimes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    movie_id BIGINT,
    room_id INT,
    start_time DATETIME,
    end_time DATETIME,
    status ENUM('OPEN', 'FULL', 'CANCELLED') DEFAULT 'OPEN',

    FOREIGN KEY (movie_id)
    REFERENCES movies(id)
    ON DELETE CASCADE,

    FOREIGN KEY (room_id)
    REFERENCES rooms(id)
    ON DELETE CASCADE
);

INSERT INTO showtimes(movie_id, room_id, start_time, end_time, status)
VALUES
(1,1,'2026-05-20 09:00:00','2026-05-20 12:00:00','OPEN'),
(2,2,'2026-05-20 13:00:00','2026-05-20 15:30:00','OPEN'),
(3,3,'2026-05-20 16:00:00','2026-05-20 18:00:00','OPEN'),
(4,4,'2026-05-20 19:00:00','2026-05-20 21:00:00','OPEN'),
(5,5,'2026-05-21 09:00:00','2026-05-21 12:00:00','OPEN');

-- =====================================================
-- SHOWTIME SEAT PRICES
-- =====================================================

CREATE TABLE showtime_seat_prices (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    showtime_id BIGINT,
    seat_type ENUM('NORMAL', 'VIP', 'COUPLE'),
    price DECIMAL(10,2),

    FOREIGN KEY (showtime_id)
    REFERENCES showtimes(id)
    ON DELETE CASCADE
);

INSERT INTO showtime_seat_prices(showtime_id, seat_type, price)
VALUES
(1,'NORMAL',90000),
(1,'VIP',120000),
(2,'COUPLE',200000),
(3,'NORMAL',80000),
(4,'VIP',140000),
(5,'NORMAL',100000);

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    status ENUM('ACTIVE', 'BLOCKED') DEFAULT 'ACTIVE'
);

INSERT INTO users(full_name, email, phone, password_hash, status)
VALUES
('Nguyen Van A','a@gmail.com','0901111111','123456','ACTIVE'),
('Tran Thi B','b@gmail.com','0902222222','123456','ACTIVE'),
('Le Van C','c@gmail.com','0903333333','123456','ACTIVE'),
('Pham Thi D','d@gmail.com','0904444444','123456','ACTIVE'),
('Hoang Van E','e@gmail.com','0905555555','123456','ACTIVE'),
('Admin','admin@gmail.com','0906666666','admin123','ACTIVE'),
('Employee','employee@gmail.com','0907777777','employee123','ACTIVE');

-- =====================================================
-- ROLES
-- =====================================================

CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50),
    description TEXT
);

INSERT INTO roles(name, description)
VALUES
('ADMIN','System admin'),
('EMPLOYEE','Cinema employee'),
('CUSTOMER','Customer');

-- =====================================================
-- USER ROLES
-- =====================================================

CREATE TABLE user_roles (
    user_id BIGINT,
    role_id INT,

    PRIMARY KEY(user_id, role_id),

    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

    FOREIGN KEY (role_id)
    REFERENCES roles(id)
    ON DELETE CASCADE
);

INSERT INTO user_roles(user_id, role_id)
VALUES
(1,3),
(2,3),
(3,3),
(4,3),
(5,3),
(6,1),
(7,2);

-- =====================================================
-- EMPLOYEES
-- =====================================================

CREATE TABLE employees (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    employee_code VARCHAR(20),
    hire_date DATE,
    salary DECIMAL(12,2),

    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

INSERT INTO employees(user_id, employee_code, hire_date, salary)
VALUES
(7,'EMP001','2025-01-10',12000000);

-- =====================================================
-- SHIFTS
-- =====================================================

CREATE TABLE shifts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id BIGINT,
    shift_date DATE,
    start_time TIME,
    end_time TIME,

    FOREIGN KEY (employee_id)
    REFERENCES employees(id)
    ON DELETE CASCADE
);

INSERT INTO shifts(employee_id, shift_date, start_time, end_time)
VALUES
(1,'2026-05-20','08:00:00','17:00:00');

-- =====================================================
-- ATTENDANCE
-- =====================================================

CREATE TABLE attendance (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id BIGINT,
    check_in DATETIME,
    check_out DATETIME,
    status ENUM('PRESENT', 'LATE', 'ABSENT') DEFAULT 'PRESENT',

    FOREIGN KEY (employee_id)
    REFERENCES employees(id)
    ON DELETE CASCADE
);

INSERT INTO attendance(employee_id, check_in, check_out, status)
VALUES
(1,'2026-05-20 08:01:00','2026-05-20 17:00:00','PRESENT');

-- =====================================================
-- BOOKINGS
-- =====================================================

CREATE TABLE bookings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    showtime_id BIGINT,
    booking_code VARCHAR(30),
    total_amount DECIMAL(12,2),
    booking_status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') DEFAULT 'CONFIRMED',

    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

    FOREIGN KEY (showtime_id)
    REFERENCES showtimes(id)
    ON DELETE CASCADE
);

INSERT INTO bookings(user_id, showtime_id, booking_code, total_amount, booking_status)
VALUES
(1,1,'BK001',180000,'CONFIRMED'),
(2,2,'BK002',200000,'CONFIRMED'),
(3,3,'BK003',80000,'CONFIRMED'),
(4,4,'BK004',140000,'PENDING'),
(5,5,'BK005',100000,'CONFIRMED');

-- =====================================================
-- BOOKING SEATS
-- =====================================================

CREATE TABLE booking_seats (
    booking_id BIGINT,
    seat_id BIGINT,
    price DECIMAL(10,2),

    PRIMARY KEY(booking_id, seat_id),

    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
    ON DELETE CASCADE,

    FOREIGN KEY (seat_id)
    REFERENCES seats(id)
    ON DELETE CASCADE
);

INSERT INTO booking_seats(booking_id, seat_id, price)
VALUES
(1,1,90000),
(1,2,90000),
(2,5,200000),
(3,7,80000),
(4,8,140000);

-- =====================================================
-- TICKETS
-- =====================================================

CREATE TABLE tickets (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id BIGINT,
    qr_code VARCHAR(255),
    checked_in BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
    ON DELETE CASCADE
);

INSERT INTO tickets(booking_id, qr_code, checked_in)
VALUES
(1,'QR001',TRUE),
(2,'QR002',FALSE),
(3,'QR003',TRUE),
(4,'QR004',FALSE),
(5,'QR005',TRUE);

-- =====================================================
-- PAYMENTS
-- =====================================================

CREATE TABLE payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id BIGINT,
    payment_method ENUM('CASH', 'MOMO', 'VNPAY'),
    amount DECIMAL(12,2),
    payment_status ENUM('PENDING', 'SUCCESS', 'FAILED') DEFAULT 'SUCCESS',

    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
    ON DELETE CASCADE
);

INSERT INTO payments(booking_id, payment_method, amount, payment_status)
VALUES
(1,'MOMO',180000,'SUCCESS'),
(2,'VNPAY',200000,'SUCCESS'),
(3,'CASH',80000,'SUCCESS'),
(4,'MOMO',140000,'PENDING'),
(5,'VNPAY',100000,'SUCCESS');

-- =====================================================
-- FOOD CATEGORIES
-- =====================================================

CREATE TABLE food_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100)
);

INSERT INTO food_categories(name)
VALUES
('Popcorn'),
('Drink'),
('Snack');

-- =====================================================
-- FOODS
-- =====================================================

CREATE TABLE foods (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id INT,
    name VARCHAR(100),
    description TEXT,
    image_url VARCHAR(255),

    FOREIGN KEY (category_id)
    REFERENCES food_categories(id)
    ON DELETE CASCADE
);

INSERT INTO foods(category_id, name, description, image_url)
VALUES
(1,'Caramel Popcorn','Sweet popcorn','pop1.jpg'),
(1,'Cheese Popcorn','Cheese popcorn','pop2.jpg'),
(2,'Coca Cola','Cold drink','drink1.jpg'),
(2,'Pepsi','Cold drink','drink2.jpg'),
(2,'7Up','Cold drink','drink3.jpg'),
(3,'Hotdog','Fast food','food1.jpg'),
(3,'French Fries','Snack','food2.jpg');

-- =====================================================
-- FOOD SIZES
-- =====================================================

CREATE TABLE food_sizes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    food_id BIGINT,
    size_name ENUM('S', 'M', 'L'),
    price DECIMAL(10,2),

    FOREIGN KEY (food_id)
    REFERENCES foods(id)
    ON DELETE CASCADE
);

INSERT INTO food_sizes(food_id, size_name, price)
VALUES
(1,'S',45000),
(1,'M',65000),
(1,'L',85000),
(3,'S',20000),
(3,'M',30000),
(4,'L',35000),
(6,'M',50000);

-- =====================================================
-- BOOKING FOODS
-- =====================================================

CREATE TABLE booking_foods (
    booking_id BIGINT,
    food_id BIGINT,
    size_name ENUM('S', 'M', 'L'),
    quantity INT,
    unit_price DECIMAL(10,2),

    PRIMARY KEY(booking_id, food_id, size_name),

    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
    ON DELETE CASCADE,

    FOREIGN KEY (food_id)
    REFERENCES foods(id)
    ON DELETE CASCADE
);

INSERT INTO booking_foods(booking_id, food_id, size_name, quantity, unit_price)
VALUES
(1,1,'M',1,65000),
(1,3,'M',2,30000),
(2,6,'M',1,50000),
(3,4,'L',1,35000),
(5,2,'S',1,45000);

-- =====================================================
-- PROMOTIONS
-- =====================================================

CREATE TABLE promotions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50),
    name VARCHAR(100),
    discount_type ENUM('PERCENT', 'FIXED'),
    discount_value DECIMAL(10,2)
);

INSERT INTO promotions(code, name, discount_type, discount_value)
VALUES
('SALE10','Discount 10%','PERCENT',10),
('SALE20','Discount 20%','PERCENT',20),
('FIX50','Discount 50K','FIXED',50000);

-- =====================================================
-- BOOKING PROMOTIONS
-- =====================================================

CREATE TABLE booking_promotions (
    booking_id BIGINT,
    promotion_id BIGINT,
    discount_amount DECIMAL(10,2),

    PRIMARY KEY(booking_id, promotion_id),

    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
    ON DELETE CASCADE,

    FOREIGN KEY (promotion_id)
    REFERENCES promotions(id)
    ON DELETE CASCADE
);

INSERT INTO booking_promotions(booking_id, promotion_id, discount_amount)
VALUES
(1,1,18000),
(2,3,50000),
(5,2,20000);