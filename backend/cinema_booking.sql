-- =====================================================
-- CINEMA BOOKING — UPDATED SCHEMA
-- Tính năng mới:
--   · Nhiều rạp (CGV, Lotte, Galaxy, BHD) theo thành phố
--   · Phòng chiếu có trạng thái, nhiều ghế thực tế
--   · Suất chiếu trải 3 tuần (show_date + week_number)
--   · Movies có director, trailer_url, FULLTEXT index
--   · Index tối ưu cho tìm kiếm nâng cao
-- Chạy: mysql -u root -p < cinema_booking_updated.sql
-- MySQL 8.0+
-- =====================================================

DROP DATABASE IF EXISTS cinema_booking;
CREATE DATABASE cinema_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cinema_booking;

-- =====================================================
-- CINEMAS — mở rộng: brand, city, logo, toạ độ
-- =====================================================

CREATE TABLE cinemas (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100)  NOT NULL,
    brand       ENUM('CGV','LOTTE','GALAXY','BHD','CINESTAR') NOT NULL DEFAULT 'CGV',
    city        VARCHAR(100)  NOT NULL DEFAULT 'Ha Noi',
    address     TEXT,
    phone       VARCHAR(20),
    logo_url    VARCHAR(500),
    latitude    DECIMAL(10,8),
    longitude   DECIMAL(11,8),
    description TEXT,
    status      ENUM('ACTIVE','CLOSED') NOT NULL DEFAULT 'ACTIVE'
);

INSERT INTO cinemas(name, brand, city, address, phone, logo_url, latitude, longitude, description, status) VALUES
-- Hà Nội
('CGV Vincom Bà Triệu',  'CGV',     'Ha Noi',    '191 Bà Triệu, Hai Bà Trưng, Hà Nội',            '0243 974 6868', 'https://cdn.cgv.vn/logo.png', 21.01348,  105.84587, 'Rạp CGV tại Vincom Bà Triệu tầng 6-7',   'ACTIVE'),
('CGV Aeon Mall Hà Đông','CGV',     'Ha Noi',    'Số 01 Canary, Dương Nội, Hà Đông, Hà Nội',      '0243 974 6868', 'https://cdn.cgv.vn/logo.png', 20.97918,  105.76983, 'Rạp CGV tại Aeon Mall Hà Đông',          'ACTIVE'),
('Lotte Cinema Cầu Giấy','LOTTE',   'Ha Noi',    'Số 54 Liễu Giai, Ba Đình, Hà Nội',              '0243 333 1333', 'https://cdn.lotte.vn/logo.png',21.03408,  105.81358, 'Lotte Cinema tại Trung tâm Lotte Hà Nội','ACTIVE'),
('BHD Star Phạm Ngọc Thạch','BHD', 'Ha Noi',    '97 Phạm Ngọc Thạch, Đống Đa, Hà Nội',           '1900 6023',     'https://cdn.bhd.vn/logo.png',  21.01871,  105.83724, 'BHD Star tại Hà Nội',                    'ACTIVE'),
-- TP Hồ Chí Minh
('CGV Vincom Center',    'CGV',     'Ho Chi Minh','70 Lê Thánh Tôn & 45 Lý Tự Trọng, Q.1, TP.HCM','028 3521 1900', 'https://cdn.cgv.vn/logo.png', 10.77685,  106.70132, 'Rạp CGV flagship tại Vincom Center Q.1', 'ACTIVE'),
('Lotte Cinema Nowzone', 'LOTTE',   'Ho Chi Minh','235 Nguyễn Văn Cừ, Q.1, TP.HCM',               '028 3925 6999', 'https://cdn.lotte.vn/logo.png',10.76004,  106.68310, 'Lotte Cinema tại Nowzone Fashion Mall',   'ACTIVE'),
('Galaxy Nguyễn Du',     'GALAXY',  'Ho Chi Minh','116 Nguyễn Du, Q.1, TP.HCM',                   '028 3822 2200', 'https://cdn.galaxy.vn/logo.png',10.77876, 106.69424, 'Rạp Galaxy trung tâm TP.HCM',            'ACTIVE'),
('CGV Aeon Mall Bình Dương','CGV',  'Binh Duong', 'Đại lộ Bình Dương, Thuận An, Bình Dương',       '0274 371 8888', 'https://cdn.cgv.vn/logo.png', 10.90822,  106.71435, 'CGV tại Aeon Mall Bình Dương',            'ACTIVE');

-- =====================================================
-- ROOMS — mở rộng: status, nhiều phòng mỗi rạp
-- =====================================================

CREATE TABLE rooms (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    cinema_id   INT NOT NULL,
    name        VARCHAR(50),
    room_type   ENUM('2D','3D','IMAX','4DX') DEFAULT '2D',
    total_seats INT DEFAULT 0,
    status      ENUM('ACTIVE','MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',

    FOREIGN KEY (cinema_id) REFERENCES cinemas(id) ON DELETE CASCADE
);

CREATE INDEX idx_rooms_cinema ON rooms(cinema_id);

INSERT INTO rooms(cinema_id, name, room_type, total_seats, status) VALUES
-- CGV Vincom Bà Triệu (cinema_id=1)
(1, 'Phòng 1 - 2D',   '2D',   80, 'ACTIVE'),
(1, 'Phòng 2 - 3D',   '3D',   80, 'ACTIVE'),
(1, 'Phòng 3 - IMAX', 'IMAX', 150,'ACTIVE'),
(1, 'Phòng 4 - 4DX',  '4DX',  60, 'ACTIVE'),
(1, 'Phòng 5 - 2D',   '2D',   70, 'MAINTENANCE'),
-- CGV Aeon Hà Đông (cinema_id=2)
(2, 'Phòng A - 2D',   '2D',   90, 'ACTIVE'),
(2, 'Phòng B - 3D',   '3D',   90, 'ACTIVE'),
(2, 'Phòng C - IMAX', 'IMAX', 160,'ACTIVE'),
(2, 'Phòng D - 4DX',  '4DX',  60, 'ACTIVE'),
-- Lotte Cầu Giấy (cinema_id=3)
(3, 'Phòng 1 - 2D',   '2D',   75, 'ACTIVE'),
(3, 'Phòng 2 - 3D',   '3D',   75, 'ACTIVE'),
(3, 'Phòng 3 - 2D',   '2D',   70, 'ACTIVE'),
-- BHD Phạm Ngọc Thạch (cinema_id=4)
(4, 'Phòng Gold - 2D','2D',   60, 'ACTIVE'),
(4, 'Phòng Gold - 3D','3D',   60, 'ACTIVE'),
-- CGV Vincom Center HCM (cinema_id=5)
(5, 'Phòng 1 - 2D',   '2D',   100,'ACTIVE'),
(5, 'Phòng 2 - 3D',   '3D',   100,'ACTIVE'),
(5, 'Phòng 3 - IMAX', 'IMAX', 200,'ACTIVE'),
(5, 'Phòng 4 - 4DX',  '4DX',  80, 'ACTIVE'),
-- Lotte Nowzone (cinema_id=6)
(6, 'Phòng A - 2D',   '2D',   80, 'ACTIVE'),
(6, 'Phòng B - 3D',   '3D',   80, 'ACTIVE'),
(6, 'Phòng C - 2D',   '2D',   80, 'ACTIVE'),
-- Galaxy Nguyễn Du (cinema_id=7)
(7, 'Phòng 1 - 2D',   '2D',   70, 'ACTIVE'),
(7, 'Phòng 2 - 3D',   '3D',   70, 'ACTIVE'),
-- CGV Aeon Bình Dương (cinema_id=8)
(8, 'Phòng A - 2D',   '2D',   90, 'ACTIVE'),
(8, 'Phòng B - IMAX', 'IMAX', 140,'ACTIVE');

-- =====================================================
-- SEATS
-- =====================================================

CREATE TABLE seats (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    room_id     INT NOT NULL,
    seat_row    CHAR(2),
    seat_number INT,
    seat_type   ENUM('NORMAL','VIP','COUPLE') DEFAULT 'NORMAL',

    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Room 1 (2D, CGV Vincom HN) — hàng A-H (8 hàng), 10 ghế/hàng = 80 ghế
INSERT INTO seats(room_id, seat_row, seat_number, seat_type)
WITH RECURSIVE n AS (
    SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 80
)
SELECT
    1,
    CHAR(64 + CEIL(i/10)),
    ((i-1) % 10) + 1,
    CASE
        WHEN CEIL(i/10) IN (4,5)                              THEN 'VIP'
        WHEN CEIL(i/10) = 8 AND ((i-1) % 10) + 1 IN (5,6)   THEN 'COUPLE'
        ELSE 'NORMAL'
    END
FROM n;

-- Room 3 (IMAX, CGV Vincom HN) — hàng A-J (10 hàng), 15 ghế/hàng = 150 ghế
INSERT INTO seats(room_id, seat_row, seat_number, seat_type)
WITH RECURSIVE n AS (
    SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 150
)
SELECT
    3,
    CHAR(64 + CEIL(i/15)),
    ((i-1) % 15) + 1,
    CASE
        WHEN CEIL(i/15) IN (5,6,7)                              THEN 'VIP'
        WHEN CEIL(i/15) = 10 AND ((i-1) % 15) + 1 IN (7,8,9)  THEN 'COUPLE'
        ELSE 'NORMAL'
    END
FROM n;

-- Room 6 (2D, CGV Aeon HN) — hàng A-I (9 hàng), 10 ghế/hàng = 90 ghế
INSERT INTO seats(room_id, seat_row, seat_number, seat_type)
WITH RECURSIVE n AS (
    SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 90
)
SELECT
    6,
    CHAR(64 + CEIL(i/10)),
    ((i-1) % 10) + 1,
    CASE
        WHEN CEIL(i/10) IN (4,5)                              THEN 'VIP'
        WHEN CEIL(i/10) = 9 AND ((i-1) % 10) + 1 IN (5,6)   THEN 'COUPLE'
        ELSE 'NORMAL'
    END
FROM n;

-- Room 16 (IMAX, CGV Vincom HCM) — hàng A-J (10 hàng), 20 ghế/hàng = 200 ghế
INSERT INTO seats(room_id, seat_row, seat_number, seat_type)
WITH RECURSIVE n AS (
    SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 200
)
SELECT
    16,
    CHAR(64 + CEIL(i/20)),
    ((i-1) % 20) + 1,
    CASE
        WHEN CEIL(i/20) IN (5,6,7)                                   THEN 'VIP'
        WHEN CEIL(i/20) = 10 AND ((i-1) % 20) + 1 IN (9,10,11,12)  THEN 'COUPLE'
        ELSE 'NORMAL'
    END
FROM n;

-- Room 19 (2D, Lotte Nowzone) — hàng A-H (8 hàng), 10 ghế/hàng = 80 ghế
INSERT INTO seats(room_id, seat_row, seat_number, seat_type)
WITH RECURSIVE n AS (
    SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 80
)
SELECT
    19,
    CHAR(64 + CEIL(i/10)),
    ((i-1) % 10) + 1,
    CASE
        WHEN CEIL(i/10) IN (4,5) THEN 'VIP'
        ELSE 'NORMAL'
    END
FROM n;

-- =====================================================
-- GENRES
-- =====================================================

CREATE TABLE genres (
    id   INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100)
);

INSERT INTO genres(name) VALUES
('Action'),('Comedy'),('Horror'),('Sci-Fi'),
('Animation'),('Drama'),('Adventure'),('Romance'),('Thriller');

-- =====================================================
-- MOVIES — mở rộng: director, trailer_url, FULLTEXT
-- =====================================================

CREATE TABLE movies (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    title        VARCHAR(255),
    description  TEXT,
    director     VARCHAR(100),
    duration     INT,
    release_date DATE,
    poster_url   VARCHAR(500),
    trailer_url  VARCHAR(500),
    language     VARCHAR(50),
    age_rating   VARCHAR(10) NOT NULL DEFAULT 'T13',
    rating       DECIMAL(3,1),
    status       ENUM('COMING_SOON','NOW_SHOWING','ENDED') DEFAULT 'NOW_SHOWING'
);

CREATE INDEX idx_movies_status_release ON movies(status, release_date);
ALTER TABLE movies ADD FULLTEXT ft_movies(title, description, director);

INSERT INTO movies(title, description, director, duration, release_date, poster_url, trailer_url, language, rating, status) VALUES
('Avengers: Endgame',
 'Sau thảm kịch của Infinity War, các Avengers tập hợp lần cuối để đảo ngược hành động của Thanos.',
 'Anthony Russo, Joe Russo', 181, '2019-04-26',
 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
 'https://youtube.com/watch?v=TcMBFSGVi1c', 'English', 9.2, 'NOW_SHOWING'),

('Spider-Man: No Way Home',
 'Peter Parker nhờ Doctor Strange giúp mọi người quên danh tính Spider-Man, dẫn đến hậu quả khó lường.',
 'Jon Watts', 148, '2021-12-17',
 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
 'https://youtube.com/watch?v=JfVOs4VSpmA', 'English', 8.7, 'NOW_SHOWING'),

('Frozen 2',
 'Elsa lên đường khám phá nguồn gốc sức mạnh băng giá của mình cùng Anna, Kristoff, Olaf và Sven.',
 'Chris Buck, Jennifer Lee', 103, '2019-11-20',
 'https://image.tmdb.org/t/p/w500/qdfARIhgpgZOBh3vfNhWS4hmSo3.jpg',
 'https://youtube.com/watch?v=Zi4LMpSDccc', 'English', 8.1, 'NOW_SHOWING'),

('The Conjuring',
 'Hai nhà điều tra hoang mang phải đối mặt với vụ quỷ ám kinh hoàng nhất sự nghiệp tại một trang trại Rhode Island.',
 'James Wan', 112, '2013-07-19',
 'https://image.tmdb.org/t/p/w500/wVYREutTvI2tmxr6ujrHT704wGF.jpg',
 'https://youtube.com/watch?v=k10ETZ41q5o', 'English', 7.9, 'NOW_SHOWING'),

('Interstellar',
 'Một nhóm phi hành gia đi xuyên lỗ sâu đục để tìm kiếm hành tinh mới cho nhân loại trước khi Trái Đất diệt vong.',
 'Christopher Nolan', 169, '2014-11-07',
 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
 'https://youtube.com/watch?v=zSWdZVtXT7E', 'English', 9.0, 'NOW_SHOWING'),

('Your Name (Kimi no Na wa)',
 'Một cậu trai ở Tokyo và một cô gái nông thôn kỳ lạ hoán đổi thân xác qua những giấc mơ.',
 'Makoto Shinkai', 106, '2016-08-26',
 'https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg',
 'https://youtube.com/watch?v=xU47nhruN-Q', 'Japanese', 8.9, 'NOW_SHOWING'),

('Dune: Part Two',
 'Paul Atreides hợp nhất với người Fremen trong khi theo đuổi con đường trả thù những kẻ đã phá hủy gia đình anh.',
 'Denis Villeneuve', 166, '2024-03-01',
 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
 'https://youtube.com/watch?v=Way9Dexny3w', 'English', 8.8, 'NOW_SHOWING'),

('Oppenheimer',
 'Câu chuyện về J. Robert Oppenheimer — nhà vật lý lý thuyết Mỹ chủ trì chế tạo bom nguyên tử đầu tiên.',
 'Christopher Nolan', 180, '2023-07-21',
 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
 'https://youtube.com/watch?v=uYPbbksJxIg', 'English', 9.1, 'NOW_SHOWING'),

('Lật Mặt 7: Một Điều Ước',
 'Câu chuyện gia đình xúc động về tình cha con trong bối cảnh hiện đại Việt Nam.',
 'Lý Hải', 132, '2024-04-26',
 'https://image.tmdb.org/t/p/w500/fyLBAgFEsQrWqNU4UMf086NDpcy.jpg',
 'https://youtube.com/watch?v=abc123', 'Vietnamese', 8.3, 'NOW_SHOWING'),

('Mai',
 'Câu chuyện tình yêu và gia đình đầy cảm xúc của đạo diễn Trấn Thành.',
 'Trấn Thành', 133, '2024-02-10',
 'https://image.tmdb.org/t/p/w500/7cuXIFqZLUWDyfDRue02eqmcUtT.jpg',
 'https://youtube.com/watch?v=xyz789', 'Vietnamese', 8.5, 'NOW_SHOWING'),

('Deadpool & Wolverine',
 'Deadpool và Wolverine bắt tay nhau trong một cuộc phiêu lưu điên rồ xuyên đa vũ trụ.',
 'Shawn Levy', 127, '2024-07-26',
 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
 'https://youtube.com/watch?v=73_1biulkYk', 'English', 8.3, 'COMING_SOON'),

('Inside Out 2',
 'Riley bước vào tuổi thiếu niên, các cảm xúc cũ phải đón thêm những người bạn mới hoàn toàn bất ngờ.',
 'Kelsey Mann', 100, '2024-06-14',
 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
 'https://youtube.com/watch?v=LEjhY15eCx0', 'English', 8.6, 'COMING_SOON');

-- =====================================================
-- MOVIE GENRES
-- =====================================================

CREATE TABLE movie_genres (
    movie_id BIGINT,
    genre_id INT,
    PRIMARY KEY(movie_id, genre_id),
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id)  ON DELETE CASCADE
);

INSERT INTO movie_genres(movie_id, genre_id) VALUES
(1,1),(1,7),(1,4),   -- Avengers: Action, Adventure, Sci-Fi
(2,1),(2,7),         -- Spider-Man: Action, Adventure
(3,5),(3,8),         -- Frozen 2: Animation, Romance
(4,3),(4,9),         -- Conjuring: Horror, Thriller
(5,4),(5,6),(5,9),   -- Interstellar: Sci-Fi, Drama, Thriller
(6,8),(6,6),(6,5),   -- Your Name: Romance, Drama, Animation
(7,4),(7,7),(7,6),   -- Dune 2: Sci-Fi, Adventure, Drama
(8,6),(8,9),(8,4),   -- Oppenheimer: Drama, Thriller, Sci-Fi
(9,6),(9,8),(9,2),   -- Lật Mặt 7: Drama, Romance, Comedy
(10,6),(10,8),       -- Mai: Drama, Romance
(11,1),(11,2),(11,7),-- Deadpool: Action, Comedy, Adventure
(12,5),(12,6),(12,2);-- Inside Out 2: Animation, Drama, Comedy

-- =====================================================
-- SHOWTIMES
-- =====================================================

CREATE TABLE showtimes (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    movie_id    BIGINT NOT NULL,
    room_id     INT    NOT NULL,
    show_date   DATE   NOT NULL,
    week_number INT    NOT NULL COMMENT 'Tuần thứ N kể từ tuần hiện tại: 0=tuần này, 1=tuần sau, 2=tuần sau nữa',
    start_time  DATETIME NOT NULL,
    end_time    DATETIME NOT NULL,
    status      ENUM('OPEN','FULL','CANCELLED') DEFAULT 'OPEN',

    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id)  REFERENCES rooms(id)  ON DELETE CASCADE
);

CREATE INDEX idx_showtimes_date        ON showtimes(show_date, status);
CREATE INDEX idx_showtimes_movie_date  ON showtimes(movie_id, show_date);
CREATE INDEX idx_showtimes_room_date   ON showtimes(room_id, show_date);

-- -------------------------------------------------------
-- TUẦN 0: 16/05 – 22/05/2026
-- -------------------------------------------------------

INSERT INTO showtimes(movie_id,room_id,show_date,week_number,start_time,end_time,status) VALUES
(1,3,'2026-05-16',0,'2026-05-16 10:00:00','2026-05-16 13:01:00','OPEN'),
(1,3,'2026-05-16',0,'2026-05-16 14:30:00','2026-05-16 17:31:00','OPEN'),
(1,3,'2026-05-16',0,'2026-05-16 20:00:00','2026-05-16 23:01:00','OPEN'),
(1,3,'2026-05-17',0,'2026-05-17 10:00:00','2026-05-17 13:01:00','OPEN'),
(1,3,'2026-05-17',0,'2026-05-17 20:00:00','2026-05-17 23:01:00','OPEN'),
(1,3,'2026-05-18',0,'2026-05-18 14:30:00','2026-05-18 17:31:00','OPEN'),
(1,16,'2026-05-16',0,'2026-05-16 09:30:00','2026-05-16 12:31:00','OPEN'),
(1,16,'2026-05-16',0,'2026-05-16 19:30:00','2026-05-16 22:31:00','OPEN'),
(1,16,'2026-05-17',0,'2026-05-17 14:00:00','2026-05-17 17:01:00','OPEN'),
(2,7,'2026-05-16',0,'2026-05-16 11:00:00','2026-05-16 13:28:00','OPEN'),
(2,7,'2026-05-16',0,'2026-05-16 16:00:00','2026-05-16 18:28:00','OPEN'),
(2,7,'2026-05-17',0,'2026-05-17 11:00:00','2026-05-17 13:28:00','OPEN'),
(2,7,'2026-05-18',0,'2026-05-18 19:00:00','2026-05-18 21:28:00','OPEN'),
(5,11,'2026-05-16',0,'2026-05-16 09:00:00','2026-05-16 11:49:00','OPEN'),
(5,11,'2026-05-16',0,'2026-05-16 19:30:00','2026-05-16 22:19:00','OPEN'),
(5,11,'2026-05-17',0,'2026-05-17 13:00:00','2026-05-17 15:49:00','OPEN'),
(6,22,'2026-05-16',0,'2026-05-16 17:00:00','2026-05-16 18:46:00','OPEN'),
(6,22,'2026-05-17',0,'2026-05-17 19:00:00','2026-05-17 20:46:00','OPEN'),
(7,1,'2026-05-18',0,'2026-05-18 10:00:00','2026-05-18 12:46:00','OPEN'),
(7,1,'2026-05-18',0,'2026-05-18 19:00:00','2026-05-18 21:46:00','OPEN'),
(7,1,'2026-05-19',0,'2026-05-19 14:30:00','2026-05-19 17:16:00','OPEN'),
(7,1,'2026-05-20',0,'2026-05-20 10:00:00','2026-05-20 12:46:00','OPEN'),
(8,13,'2026-05-19',0,'2026-05-19 18:30:00','2026-05-19 21:30:00','OPEN'),
(8,13,'2026-05-20',0,'2026-05-20 15:00:00','2026-05-20 18:00:00','OPEN'),
(9,23,'2026-05-16',0,'2026-05-16 10:30:00','2026-05-16 12:42:00','OPEN'),
(9,23,'2026-05-16',0,'2026-05-16 20:00:00','2026-05-16 22:12:00','OPEN'),
(9,19,'2026-05-17',0,'2026-05-17 11:00:00','2026-05-17 13:12:00','OPEN'),
(9,19,'2026-05-18',0,'2026-05-18 18:30:00','2026-05-18 20:42:00','OPEN'),
(10,20,'2026-05-17',0,'2026-05-17 14:00:00','2026-05-17 16:13:00','OPEN'),
(10,20,'2026-05-19',0,'2026-05-19 19:00:00','2026-05-19 21:13:00','OPEN'),
(3,24,'2026-05-21',0,'2026-05-21 10:00:00','2026-05-21 11:43:00','OPEN'),
(3,24,'2026-05-22',0,'2026-05-22 14:00:00','2026-05-22 15:43:00','OPEN');

-- -------------------------------------------------------
-- TUẦN 1: 23/05 – 29/05/2026
-- -------------------------------------------------------

INSERT INTO showtimes(movie_id,room_id,show_date,week_number,start_time,end_time,status) VALUES
(1,3,'2026-05-23',1,'2026-05-23 10:00:00','2026-05-23 13:01:00','OPEN'),
(1,3,'2026-05-23',1,'2026-05-23 20:00:00','2026-05-23 23:01:00','OPEN'),
(1,3,'2026-05-24',1,'2026-05-24 14:30:00','2026-05-24 17:31:00','OPEN'),
(1,3,'2026-05-25',1,'2026-05-25 10:00:00','2026-05-25 13:01:00','OPEN'),
(1,16,'2026-05-23',1,'2026-05-23 09:30:00','2026-05-23 12:31:00','OPEN'),
(1,16,'2026-05-24',1,'2026-05-24 19:30:00','2026-05-24 22:31:00','OPEN'),
(2,7,'2026-05-23',1,'2026-05-23 11:00:00','2026-05-23 13:28:00','OPEN'),
(2,7,'2026-05-25',1,'2026-05-25 19:00:00','2026-05-25 21:28:00','OPEN'),
(2,8,'2026-05-24',1,'2026-05-24 16:00:00','2026-05-24 18:28:00','OPEN'),
(5,11,'2026-05-23',1,'2026-05-23 09:00:00','2026-05-23 11:49:00','OPEN'),
(5,11,'2026-05-26',1,'2026-05-26 19:30:00','2026-05-26 22:19:00','OPEN'),
(7,1,'2026-05-23',1,'2026-05-23 15:00:00','2026-05-23 17:46:00','OPEN'),
(7,1,'2026-05-24',1,'2026-05-24 10:00:00','2026-05-24 12:46:00','OPEN'),
(7,1,'2026-05-26',1,'2026-05-26 19:00:00','2026-05-26 21:46:00','OPEN'),
(8,13,'2026-05-24',1,'2026-05-24 18:00:00','2026-05-24 21:00:00','OPEN'),
(8,14,'2026-05-25',1,'2026-05-25 19:30:00','2026-05-25 22:30:00','OPEN'),
(9,19,'2026-05-23',1,'2026-05-23 11:00:00','2026-05-23 13:12:00','OPEN'),
(9,23,'2026-05-25',1,'2026-05-25 20:00:00','2026-05-25 22:12:00','OPEN'),
(10,20,'2026-05-24',1,'2026-05-24 14:00:00','2026-05-24 16:13:00','OPEN'),
(10,19,'2026-05-27',1,'2026-05-27 19:00:00','2026-05-27 21:13:00','OPEN'),
(6,22,'2026-05-24',1,'2026-05-24 17:00:00','2026-05-24 18:46:00','OPEN'),
(6,22,'2026-05-28',1,'2026-05-28 19:30:00','2026-05-28 21:16:00','OPEN'),
(11,1,'2026-05-25',1,'2026-05-25 10:00:00','2026-05-25 12:07:00','OPEN'),
(11,1,'2026-05-25',1,'2026-05-25 20:00:00','2026-05-25 22:07:00','OPEN'),
(11,16,'2026-05-25',1,'2026-05-25 14:30:00','2026-05-25 16:37:00','OPEN'),
(3,24,'2026-05-25',1,'2026-05-25 10:00:00','2026-05-25 11:43:00','OPEN'),
(3,24,'2026-05-28',1,'2026-05-28 15:00:00','2026-05-28 16:43:00','OPEN');

-- -------------------------------------------------------
-- TUẦN 2: 30/05 – 05/06/2026
-- -------------------------------------------------------

INSERT INTO showtimes(movie_id,room_id,show_date,week_number,start_time,end_time,status) VALUES
(1,3,'2026-05-30',2,'2026-05-30 10:00:00','2026-05-30 13:01:00','OPEN'),
(1,3,'2026-05-30',2,'2026-05-30 20:00:00','2026-05-30 23:01:00','OPEN'),
(1,3,'2026-06-01',2,'2026-06-01 14:30:00','2026-06-01 17:31:00','OPEN'),
(1,16,'2026-05-30',2,'2026-05-30 09:30:00','2026-05-30 12:31:00','OPEN'),
(1,16,'2026-06-02',2,'2026-06-02 19:30:00','2026-06-02 22:31:00','OPEN'),
(2,7,'2026-05-30',2,'2026-05-30 11:00:00','2026-05-30 13:28:00','OPEN'),
(2,8,'2026-06-01',2,'2026-06-01 19:00:00','2026-06-01 21:28:00','OPEN'),
(7,1,'2026-05-30',2,'2026-05-30 15:00:00','2026-05-30 17:46:00','OPEN'),
(7,1,'2026-06-02',2,'2026-06-02 10:00:00','2026-06-02 12:46:00','OPEN'),
(7,6,'2026-06-03',2,'2026-06-03 19:00:00','2026-06-03 21:46:00','OPEN'),
(8,13,'2026-05-31',2,'2026-05-31 18:00:00','2026-05-31 21:00:00','OPEN'),
(8,14,'2026-06-02',2,'2026-06-02 19:30:00','2026-06-02 22:30:00','OPEN'),
(11,1,'2026-05-30',2,'2026-05-30 10:00:00','2026-05-30 12:07:00','OPEN'),
(11,1,'2026-05-30',2,'2026-05-30 20:00:00','2026-05-30 22:07:00','OPEN'),
(11,16,'2026-06-01',2,'2026-06-01 14:30:00','2026-06-01 16:37:00','OPEN'),
(11,16,'2026-06-03',2,'2026-06-03 19:30:00','2026-06-03 21:37:00','OPEN'),
(12,3,'2026-06-01',2,'2026-06-01 10:00:00','2026-06-01 11:40:00','OPEN'),
(12,3,'2026-06-01',2,'2026-06-01 13:00:00','2026-06-01 14:40:00','OPEN'),
(12,16,'2026-06-02',2,'2026-06-02 10:00:00','2026-06-02 11:40:00','OPEN'),
(12,16,'2026-06-03',2,'2026-06-03 14:00:00','2026-06-03 15:40:00','OPEN'),
(12,24,'2026-06-04',2,'2026-06-04 10:00:00','2026-06-04 11:40:00','OPEN'),
(9,19,'2026-06-01',2,'2026-06-01 11:00:00','2026-06-01 13:12:00','OPEN'),
(9,23,'2026-06-03',2,'2026-06-03 20:00:00','2026-06-03 22:12:00','OPEN'),
(10,20,'2026-05-31',2,'2026-05-31 14:00:00','2026-05-31 16:13:00','OPEN'),
(10,20,'2026-06-04',2,'2026-06-04 19:00:00','2026-06-04 21:13:00','OPEN'),
(6,22,'2026-06-03',2,'2026-06-03 17:00:00','2026-06-03 18:46:00','OPEN'),
(5,11,'2026-06-02',2,'2026-06-02 09:00:00','2026-06-02 11:49:00','OPEN');

-- =====================================================
-- SHOWTIME SEAT PRICES
-- =====================================================

CREATE TABLE showtime_seat_prices (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    showtime_id BIGINT,
    seat_type   ENUM('NORMAL','VIP','COUPLE'),
    price       DECIMAL(10,2),
    FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
);

DELIMITER $$
CREATE PROCEDURE insert_prices()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE sid  BIGINT;
    DECLARE rtype VARCHAR(10);
    DECLARE cur CURSOR FOR
        SELECT s.id, r.room_type
        FROM showtimes s
        JOIN rooms r ON r.id = s.room_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    OPEN cur;
    price_loop: LOOP
        FETCH cur INTO sid, rtype;
        IF done THEN LEAVE price_loop; END IF;
        IF rtype = '2D' THEN
            INSERT INTO showtime_seat_prices(showtime_id, seat_type, price) VALUES
            (sid,'NORMAL',75000),(sid,'VIP',110000),(sid,'COUPLE',190000);
        ELSEIF rtype = '3D' THEN
            INSERT INTO showtime_seat_prices(showtime_id, seat_type, price) VALUES
            (sid,'NORMAL',90000),(sid,'VIP',130000),(sid,'COUPLE',220000);
        ELSEIF rtype = 'IMAX' THEN
            INSERT INTO showtime_seat_prices(showtime_id, seat_type, price) VALUES
            (sid,'NORMAL',120000),(sid,'VIP',160000),(sid,'COUPLE',280000);
        ELSEIF rtype = '4DX' THEN
            INSERT INTO showtime_seat_prices(showtime_id, seat_type, price) VALUES
            (sid,'NORMAL',130000),(sid,'VIP',170000),(sid,'COUPLE',300000);
        END IF;
    END LOOP;
    CLOSE cur;
END$$
DELIMITER ;

CALL insert_prices();
DROP PROCEDURE insert_prices;

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE users (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name     VARCHAR(100),
    email         VARCHAR(100) UNIQUE,
    phone         VARCHAR(20),
    birth_date    DATE,
    password_hash VARCHAR(255),
    status        ENUM('ACTIVE','BLOCKED') DEFAULT 'ACTIVE'
);

-- =====================================================
-- PENDING USERS (ĐĂNG KÝ TẠM + OTP)
-- Chỉ định nghĩa 1 lần duy nhất ở đây
-- =====================================================

CREATE TABLE pending_users (
    id                BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name         VARCHAR(100),
    email             VARCHAR(100) UNIQUE NOT NULL,
    phone             VARCHAR(20),
    birth_date        DATE,
    password_hash     VARCHAR(255) NOT NULL,
    verification_code CHAR(6) NOT NULL,
    status            ENUM('PENDING','VERIFIED','EXPIRED') DEFAULT 'PENDING',
    expires_at        DATETIME NOT NULL,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pending_email ON pending_users(email);
CREATE INDEX idx_pending_code  ON pending_users(verification_code);

INSERT INTO users(full_name, email, phone, password_hash, status) VALUES
('Nguyen Van A',    'a@gmail.com',        '0901111111', '123456',      'ACTIVE'),
('Tran Thi B',      'b@gmail.com',        '0902222222', '123456',      'ACTIVE'),
('Le Van C',        'c@gmail.com',        '0903333333', '123456',      'ACTIVE'),
('Pham Thi D',      'd@gmail.com',        '0904444444', '123456',      'ACTIVE'),
('Hoang Van E',     'e@gmail.com',        '0905555555', '123456',      'ACTIVE'),
('Admin',           'admin@gmail.com',    '0906666666', 'admin123',    'ACTIVE'),
('Employee CGV',    'employee@gmail.com', '0907777777', 'employee123', 'ACTIVE'),
('Nguyen Thi Lan',  'lan@gmail.com',      '0911111111', '123456',      'ACTIVE'),
('Tran Van Minh',   'minh@gmail.com',     '0912222222', '123456',      'ACTIVE'),
('Le Thi Hoa',      'hoa@gmail.com',      '0913333333', '123456',      'ACTIVE'),
('Pham Van Duc',    'duc@gmail.com',      '0914444444', '123456',      'ACTIVE'),
('Hoang Thi Mai',   'mai@gmail.com',      '0915555555', '123456',      'ACTIVE'),
('Vo Van Tuan',     'tuan@gmail.com',     '0916666666', '123456',      'ACTIVE'),
('Dang Thi Thu',    'thu@gmail.com',      '0917777777', '123456',      'ACTIVE'),
('Bui Van Hung',    'hung@gmail.com',     '0918888888', '123456',      'ACTIVE'),
('Do Thi Linh',     'linh@gmail.com',     '0919999999', '123456',      'ACTIVE'),
('Nguyen Van Khanh','khanh@gmail.com',    '0920000000', '123456',      'ACTIVE');

-- =====================================================
-- ROLES & USER_ROLES
-- =====================================================

CREATE TABLE roles (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(50),
    description TEXT
);

INSERT INTO roles(name, description) VALUES
('ADMIN',    'System admin'),
('EMPLOYEE', 'Cinema employee'),
('CUSTOMER', 'Customer');

CREATE TABLE user_roles (
    user_id BIGINT,
    role_id INT,
    PRIMARY KEY(user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id)   ON DELETE CASCADE
);

INSERT INTO user_roles(user_id, role_id) VALUES
(1,3),(2,3),(3,3),(4,3),(5,3),(6,1),(7,2),
(8,3),(9,3),(10,3),(11,3),(12,3),(13,3),(14,3),(15,3),(16,3),(17,3);

-- =====================================================
-- EMPLOYEES, SHIFTS, ATTENDANCE
-- =====================================================

CREATE TABLE employees (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id       BIGINT,
    employee_code VARCHAR(20),
    hire_date     DATE,
    salary        DECIMAL(12,2),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO employees(user_id, employee_code, hire_date, salary) VALUES
(7,'EMP001','2025-01-10',12000000);

CREATE TABLE shifts (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id BIGINT,
    shift_date  DATE,
    start_time  TIME,
    end_time    TIME,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

INSERT INTO shifts(employee_id, shift_date, start_time, end_time) VALUES
(1,'2026-05-20','08:00:00','17:00:00');

CREATE TABLE attendance (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id BIGINT,
    check_in    DATETIME,
    check_out   DATETIME,
    status      ENUM('PRESENT','LATE','ABSENT') DEFAULT 'PRESENT',
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

INSERT INTO attendance(employee_id, check_in, check_out, status) VALUES
(1,'2026-05-20 08:01:00','2026-05-20 17:00:00','PRESENT');

-- =====================================================
-- BOOKINGS
-- =====================================================

CREATE TABLE bookings (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id        BIGINT,
    showtime_id    BIGINT,
    booking_code   VARCHAR(30),
    total_amount   DECIMAL(12,2),
    booking_status ENUM('PENDING','CONFIRMED','CANCELLED') DEFAULT 'CONFIRMED',
    FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
    FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
);

CREATE INDEX idx_bookings_user   ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(booking_status);

INSERT INTO bookings(user_id, showtime_id, booking_code, total_amount, booking_status) VALUES
(1, 1, 'BK001', 240000, 'CONFIRMED'),
(2, 2, 'BK002', 180000, 'CONFIRMED'),
(3, 6, 'BK003', 165000, 'CONFIRMED'),
(4, 5, 'BK004', 280000, 'PENDING'),
(5, 9, 'BK005', 150000, 'CONFIRMED');

-- =====================================================
-- BOOKING SEATS
-- =====================================================

CREATE TABLE booking_seats (
    booking_id BIGINT,
    seat_id    BIGINT,
    price      DECIMAL(10,2),
    PRIMARY KEY(booking_id, seat_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id)    REFERENCES seats(id)    ON DELETE CASCADE
);

INSERT INTO booking_seats(booking_id, seat_id, price) VALUES
(1, (SELECT id FROM seats WHERE room_id=3 AND seat_row='D' AND seat_number=7 LIMIT 1), 120000),
(1, (SELECT id FROM seats WHERE room_id=3 AND seat_row='D' AND seat_number=8 LIMIT 1), 120000);

INSERT INTO booking_seats(booking_id, seat_id, price) VALUES
(2, (SELECT id FROM seats WHERE room_id=1 AND seat_row='A' AND seat_number=1 LIMIT 1), 75000),
(2, (SELECT id FROM seats WHERE room_id=1 AND seat_row='E' AND seat_number=3 LIMIT 1), 110000);

-- =====================================================
-- TICKETS
-- =====================================================

CREATE TABLE tickets (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id BIGINT,
    qr_code    VARCHAR(255),
    checked_in BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

INSERT INTO tickets(booking_id, qr_code, checked_in) VALUES
(1,'QR-BK001-001',TRUE),
(1,'QR-BK001-002',TRUE),
(2,'QR-BK002-001',FALSE),
(2,'QR-BK002-002',FALSE),
(3,'QR-BK003-001',TRUE);

-- =====================================================
-- PAYMENTS
-- =====================================================

CREATE TABLE payments (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id     BIGINT,
    payment_method ENUM('CASH','MOMO','VNPAY','ZALOPAY'),
    amount         DECIMAL(12,2),
    payment_status ENUM('PENDING','SUCCESS','FAILED') DEFAULT 'SUCCESS',
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

INSERT INTO payments(booking_id, payment_method, amount, payment_status) VALUES
(1,'MOMO',   240000,'SUCCESS'),
(2,'VNPAY',  180000,'SUCCESS'),
(3,'ZALOPAY',165000,'SUCCESS'),
(4,'MOMO',   280000,'PENDING'),
(5,'CASH',   150000,'SUCCESS');

-- =====================================================
-- FOOD CATEGORIES, FOODS, FOOD SIZES
-- =====================================================

CREATE TABLE food_categories (
    id   INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100)
);

INSERT INTO food_categories(name) VALUES
('Popcorn'),('Drink'),('Snack'),('Combo');

CREATE TABLE foods (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id INT,
    name        VARCHAR(100),
    description TEXT,
    image_url   VARCHAR(255),
    FOREIGN KEY (category_id) REFERENCES food_categories(id) ON DELETE CASCADE
);

INSERT INTO foods(category_id, name, description, image_url) VALUES
(1,'Bắp Rang Caramel',  'Bắp rang ngọt vị caramel',         'pop1.jpg'),
(1,'Bắp Rang Phô Mai',  'Bắp rang mặn vị phô mai',          'pop2.jpg'),
(2,'Coca Cola',         'Nước ngọt có ga',                   'drink1.jpg'),
(2,'Pepsi',             'Nước ngọt có ga',                   'drink2.jpg'),
(2,'7Up',               'Nước ngọt có ga vị chanh',          'drink3.jpg'),
(3,'Hotdog',            'Xúc xích kẹp bánh mì',              'food1.jpg'),
(3,'Khoai Tây Chiên',   'Khoai tây chiên giòn',              'food2.jpg'),
(4,'Combo 1',           '1 Bắp M + 1 Nước M',               'combo1.jpg'),
(4,'Combo 2',           '2 Bắp M + 2 Nước M',               'combo2.jpg');

CREATE TABLE food_sizes (
    id        BIGINT PRIMARY KEY AUTO_INCREMENT,
    food_id   BIGINT,
    size_name ENUM('S','M','L'),
    price     DECIMAL(10,2),
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

INSERT INTO food_sizes(food_id, size_name, price) VALUES
(1,'S',45000),(1,'M',65000),(1,'L',85000),
(2,'S',45000),(2,'M',65000),(2,'L',85000),
(3,'S',20000),(3,'M',30000),(3,'L',39000),
(4,'S',20000),(4,'M',30000),(4,'L',39000),
(5,'S',18000),(5,'M',27000),(5,'L',35000),
(6,'M',50000),(6,'L',65000),
(7,'S',35000),(7,'M',49000),(7,'L',59000),
(8,'M',99000),
(9,'M',179000);

-- =====================================================
-- BOOKING FOODS
-- =====================================================

CREATE TABLE booking_foods (
    booking_id BIGINT,
    food_id    BIGINT,
    size_name  ENUM('S','M','L'),
    quantity   INT,
    unit_price DECIMAL(10,2),
    PRIMARY KEY(booking_id, food_id, size_name),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id)    REFERENCES foods(id)    ON DELETE CASCADE
);

INSERT INTO booking_foods(booking_id, food_id, size_name, quantity, unit_price) VALUES
(1,1,'M',1,65000),(1,3,'M',2,30000),
(2,8,'M',1,99000),
(3,2,'L',1,85000),(3,5,'M',1,27000),
(5,1,'S',1,45000);

-- =====================================================
-- PROMOTIONS
-- =====================================================

CREATE TABLE promotions (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    code           VARCHAR(50) UNIQUE,
    name           VARCHAR(100),
    discount_type  ENUM('PERCENT','FIXED'),
    discount_value DECIMAL(10,2),
    min_amount     DECIMAL(10,2) DEFAULT 0,
    expire_date    DATE,
    is_active      BOOLEAN DEFAULT TRUE
);

INSERT INTO promotions(code, name, discount_type, discount_value, min_amount, expire_date, is_active) VALUES
('SALE10',  'Giảm 10%',       'PERCENT', 10,    100000, '2026-12-31', TRUE),
('SALE20',  'Giảm 20%',       'PERCENT', 20,    200000, '2026-06-30', TRUE),
('FIX50K',  'Giảm 50.000đ',   'FIXED',   50000, 150000, '2026-06-30', TRUE),
('SUMMER',  'Summer Sale 15%','PERCENT', 15,    120000, '2026-08-31', TRUE),
('WELCOME', 'Chào mừng 30K',  'FIXED',   30000, 0,      '2026-12-31', TRUE);

-- =====================================================
-- BOOKING PROMOTIONS
-- =====================================================

CREATE TABLE booking_promotions (
    booking_id    BIGINT,
    promotion_id  BIGINT,
    discount_amount DECIMAL(10,2),
    PRIMARY KEY(booking_id, promotion_id),
    FOREIGN KEY (booking_id)   REFERENCES bookings(id)   ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE
);

INSERT INTO booking_promotions(booking_id, promotion_id, discount_amount) VALUES
(1, 1, 24000),
(2, 5, 30000),
(5, 1, 15000);

-- =====================================================
-- KIỂM TRA DỮ LIỆU
-- =====================================================

SELECT '=== TỔNG KẾT ===' AS '';
SELECT CONCAT('Cinemas : ', COUNT(*)) AS summary FROM cinemas;
SELECT CONCAT('Rooms   : ', COUNT(*)) AS summary FROM rooms;
SELECT CONCAT('Seats   : ', COUNT(*)) AS summary FROM seats;
SELECT CONCAT('Movies  : ', COUNT(*)) AS summary FROM movies;
SELECT CONCAT('Showtime: ', COUNT(*)) AS summary FROM showtimes;
SELECT CONCAT('  Tuần 0: ', COUNT(*)) AS summary FROM showtimes WHERE week_number = 0;
SELECT CONCAT('  Tuần 1: ', COUNT(*)) AS summary FROM showtimes WHERE week_number = 1;
SELECT CONCAT('  Tuần 2: ', COUNT(*)) AS summary FROM showtimes WHERE week_number = 2;
SELECT CONCAT('ST Prices: ', COUNT(*)) AS summary FROM showtime_seat_prices;

SELECT '=== SUẤT CHIẾU MỖI RẠP ===' AS '';
SELECT c.name AS cinema, COUNT(s.id) AS so_suat
FROM showtimes s
JOIN rooms r ON r.id = s.room_id
JOIN cinemas c ON c.id = r.cinema_id
GROUP BY c.name ORDER BY so_suat DESC;

SELECT '=== QUERY MẪU: Chọn rạp + phim + ngày ===' AS '';
SELECT
    c.name AS cinema, c.city,
    r.name AS phong, r.room_type,
    DATE(s.start_time) AS ngay,
    TIME(s.start_time) AS gio_chieu,
    m.title AS phim
FROM showtimes s
JOIN movies  m ON m.id = s.movie_id
JOIN rooms   r ON r.id = s.room_id
JOIN cinemas c ON c.id = r.cinema_id
WHERE m.id = 1
  AND c.city = 'Ha Noi'
  AND s.show_date BETWEEN '2026-05-16' AND '2026-05-29'
  AND s.status = 'OPEN'
ORDER BY s.show_date, s.start_time
LIMIT 10;

USE cinema_booking;

-- =====================================================
-- 1) SINH GHẾ CHO CÁC PHÒNG CHƯA CÓ GHẾ
-- =====================================================

INSERT INTO seats(room_id, seat_row, seat_number, seat_type)
WITH RECURSIVE n AS (
    SELECT 1 AS i
    UNION ALL
    SELECT i + 1 FROM n WHERE i < 220
), room_cfg AS (
    SELECT
        r.id AS room_id,
        r.total_seats,
        CASE
            WHEN r.total_seats >= 190 THEN 20
            WHEN r.total_seats >= 150 THEN 15
            WHEN r.total_seats = 140 THEN 14
            ELSE 10
        END AS seats_per_row
    FROM rooms r
    WHERE NOT EXISTS (
        SELECT 1 FROM seats s WHERE s.room_id = r.id
    )
)
SELECT
    rc.room_id,
    CHAR(64 + CEIL(n.i / rc.seats_per_row)) AS seat_row,
    ((n.i - 1) % rc.seats_per_row) + 1 AS seat_number,
    CASE
        WHEN CEIL(n.i / rc.seats_per_row) IN (4,5,6) THEN 'VIP'
        WHEN CEIL(n.i / rc.seats_per_row) = CEIL(rc.total_seats / rc.seats_per_row)
             AND ((n.i - 1) % rc.seats_per_row) + 1 IN (5,6,7,8) THEN 'COUPLE'
        ELSE 'NORMAL'
    END AS seat_type
FROM room_cfg rc
JOIN n ON n.i <= rc.total_seats;

-- =====================================================
-- 2) THÊM RẠP MỚI + PHÒNG MỚI
-- =====================================================

INSERT INTO cinemas(name, brand, city, address, phone, logo_url, latitude, longitude, description, status) VALUES
('Cinestar Quốc Thanh', 'CINESTAR', 'Ho Chi Minh', '271 Nguyễn Trãi, Q.1, TP.HCM', '028 7300 8881', 'https://cdn.cinestar.vn/logo.png', 10.76491, 106.68824, 'Rạp Cinestar khu trung tâm TP.HCM', 'ACTIVE'),
('Galaxy Long Xuyên', 'GALAXY', 'An Giang', 'Lầu 3, Vincom Plaza Long Xuyên, An Giang', '0296 730 8888', 'https://cdn.galaxy.vn/logo.png', 10.38639, 105.43518, 'Rạp Galaxy tại Long Xuyên', 'ACTIVE'),
('CGV Sense City Cần Thơ', 'CGV', 'Can Tho', 'Sense City, 01 Đại lộ Hòa Bình, Cần Thơ', '0292 373 3333', 'https://cdn.cgv.vn/logo.png', 10.03371, 105.78362, 'Rạp CGV tại trung tâm Cần Thơ', 'ACTIVE');

INSERT INTO rooms(cinema_id, name, room_type, total_seats, status) VALUES
((SELECT id FROM cinemas WHERE name='Cinestar Quốc Thanh' LIMIT 1), 'Phòng 1 - 2D', '2D', 80, 'ACTIVE'),
((SELECT id FROM cinemas WHERE name='Cinestar Quốc Thanh' LIMIT 1), 'Phòng 2 - 3D', '3D', 90, 'ACTIVE'),
((SELECT id FROM cinemas WHERE name='Galaxy Long Xuyên' LIMIT 1), 'Phòng A - 2D', '2D', 70, 'ACTIVE'),
((SELECT id FROM cinemas WHERE name='Galaxy Long Xuyên' LIMIT 1), 'Phòng B - 3D', '3D', 70, 'ACTIVE'),
((SELECT id FROM cinemas WHERE name='CGV Sense City Cần Thơ' LIMIT 1), 'Phòng 1 - 2D', '2D', 100, 'ACTIVE'),
((SELECT id FROM cinemas WHERE name='CGV Sense City Cần Thơ' LIMIT 1), 'Phòng 2 - IMAX', 'IMAX', 150, 'ACTIVE');

INSERT INTO seats(room_id, seat_row, seat_number, seat_type)
WITH RECURSIVE n AS (
    SELECT 1 AS i
    UNION ALL
    SELECT i + 1 FROM n WHERE i < 200
), room_cfg AS (
    SELECT
        r.id AS room_id,
        r.total_seats,
        CASE
            WHEN r.total_seats >= 150 THEN 15
            ELSE 10
        END AS seats_per_row
    FROM rooms r
    JOIN cinemas c ON c.id = r.cinema_id
    WHERE c.name IN ('Cinestar Quốc Thanh','Galaxy Long Xuyên','CGV Sense City Cần Thơ')
      AND NOT EXISTS (SELECT 1 FROM seats s WHERE s.room_id = r.id)
)
SELECT
    rc.room_id,
    CHAR(64 + CEIL(n.i / rc.seats_per_row)),
    ((n.i - 1) % rc.seats_per_row) + 1,
    CASE
        WHEN CEIL(n.i / rc.seats_per_row) IN (4,5,6) THEN 'VIP'
        WHEN CEIL(n.i / rc.seats_per_row) = CEIL(rc.total_seats / rc.seats_per_row)
             AND ((n.i - 1) % rc.seats_per_row) + 1 IN (5,6,7,8) THEN 'COUPLE'
        ELSE 'NORMAL'
    END
FROM room_cfg rc
JOIN n ON n.i <= rc.total_seats;

-- =====================================================
-- 3) THÊM PHIM
-- =====================================================

INSERT INTO movies(title, description, director, duration, release_date, poster_url, trailer_url, language, rating, status) VALUES
('Godzilla x Kong: The New Empire', 'Godzilla và Kong hợp sức chống lại mối đe dọa khổng lồ mới trong lòng Trái Đất.', 'Adam Wingard', 115, '2024-03-29', 'https://image.tmdb.org/t/p/w500/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg', 'https://youtube.com/watch?v=lV1OOlGwExM', 'English', 7.5, 'NOW_SHOWING'),
('Kung Fu Panda 4', 'Po đối mặt với nhiệm vụ tìm người kế nhiệm và chống lại phản diện biến hình nguy hiểm.', 'Mike Mitchell', 94, '2024-03-08', 'https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg', 'https://youtube.com/watch?v=_inKs4eeHiI', 'English', 7.7, 'NOW_SHOWING'),
('Exhuma', 'Hai pháp sư, một thầy phong thủy và một chuyên gia tang lễ khai quật bí mật đáng sợ.', 'Jang Jae-hyun', 134, '2024-02-22', 'https://image.tmdb.org/t/p/w500/pQYHouPsDw32FhDLr7E3jmw0WTk.jpg', 'https://youtube.com/watch?v=H2O193v3jkM', 'Korean', 8.0, 'NOW_SHOWING'),
('Civil War', 'Một nhóm nhà báo đi qua nước Mỹ trong bối cảnh nội chiến hiện đại đầy căng thẳng.', 'Alex Garland', 109, '2024-04-12', 'https://image.tmdb.org/t/p/w500/sh7Rg8Er3tFcN9BpKIPOMvALgZd.jpg', 'https://youtube.com/watch?v=aDyQxtg0V2w', 'English', 7.8, 'NOW_SHOWING'),
('A Quiet Place: Day One', 'Ngày đầu tiên khi những sinh vật săn mồi bằng âm thanh xuất hiện tại thành phố New York.', 'Michael Sarnoski', 99, '2024-06-28', 'https://image.tmdb.org/t/p/w500/yrpPYKijwdMHyTGIOd1iK1h0Xno.jpg', 'https://youtube.com/watch?v=YPY7J-flzE8', 'English', 8.1, 'COMING_SOON'),
('Detective Conan: The Million-dollar Pentagram', 'Conan điều tra vụ án xoay quanh thanh kiếm quý và Kid tại Hakodate.', 'Chika Nagaoka', 111, '2024-04-12', 'https://m.media-amazon.com/images/M/MV5BNGNjMjVmODYtMGMzZi00MWUyLTk1ZDQtYzI2ZTk2MmYzYTZiXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg', 'https://youtube.com/watch?v=conan2024', 'Japanese', 8.2, 'COMING_SOON'),
('Móng Vuốt', 'Một chuyến dã ngoại biến thành ác mộng khi nhóm bạn bị săn đuổi bởi sinh vật bí ẩn.', 'Lê Thanh Sơn', 96, '2024-06-07', 'https://cdn.galaxycine.vn/media/2024/6/6/mong-vuot-500-docx_1717644756258.jpg', 'https://youtube.com/watch?v=mongvuot', 'Vietnamese', 7.4, 'COMING_SOON'),
('Doraemon: Nobita và Bản Giao Hưởng Địa Cầu', 'Nobita cùng Doraemon bước vào cuộc phiêu lưu âm nhạc để cứu Trái Đất.', 'Kazuaki Imai', 115, '2024-03-01', 'https://iguov8nhvyobj.vcdn.cloud/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/d/r/drm24_-_poster.jpg', 'https://youtube.com/watch?v=doraemon2024', 'Japanese', 8.0, 'NOW_SHOWING');

INSERT INTO movie_genres(movie_id, genre_id) VALUES
((SELECT id FROM movies WHERE title='Godzilla x Kong: The New Empire'), 1),
((SELECT id FROM movies WHERE title='Godzilla x Kong: The New Empire'), 4),
((SELECT id FROM movies WHERE title='Godzilla x Kong: The New Empire'), 7),
((SELECT id FROM movies WHERE title='Kung Fu Panda 4'), 5),
((SELECT id FROM movies WHERE title='Kung Fu Panda 4'), 2),
((SELECT id FROM movies WHERE title='Kung Fu Panda 4'), 7),
((SELECT id FROM movies WHERE title='Exhuma'), 3),
((SELECT id FROM movies WHERE title='Exhuma'), 9),
((SELECT id FROM movies WHERE title='Civil War'), 1),
((SELECT id FROM movies WHERE title='Civil War'), 6),
((SELECT id FROM movies WHERE title='Civil War'), 9),
((SELECT id FROM movies WHERE title='A Quiet Place: Day One'), 3),
((SELECT id FROM movies WHERE title='A Quiet Place: Day One'), 4),
((SELECT id FROM movies WHERE title='Detective Conan: The Million-dollar Pentagram'), 5),
((SELECT id FROM movies WHERE title='Detective Conan: The Million-dollar Pentagram'), 7),
((SELECT id FROM movies WHERE title='Móng Vuốt'), 3),
((SELECT id FROM movies WHERE title='Móng Vuốt'), 9),
((SELECT id FROM movies WHERE title='Doraemon: Nobita và Bản Giao Hưởng Địa Cầu'), 5),
((SELECT id FROM movies WHERE title='Doraemon: Nobita và Bản Giao Hưởng Địa Cầu'), 7);

-- =====================================================
-- 4) THÊM SUẤT CHIẾU
-- =====================================================

INSERT INTO showtimes(movie_id, room_id, show_date, week_number, start_time, end_time, status) VALUES
((SELECT id FROM movies WHERE title='Godzilla x Kong: The New Empire'), 3, '2026-06-05', 2, '2026-06-05 19:00:00', '2026-06-05 20:55:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Godzilla x Kong: The New Empire'), 16, '2026-06-06', 3, '2026-06-06 20:00:00', '2026-06-06 21:55:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Godzilla x Kong: The New Empire'), (SELECT r.id FROM rooms r JOIN cinemas c ON c.id=r.cinema_id WHERE c.name='CGV Sense City Cần Thơ' AND r.room_type='IMAX' LIMIT 1), '2026-06-07', 3, '2026-06-07 18:30:00', '2026-06-07 20:25:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Kung Fu Panda 4'), 24, '2026-06-05', 2, '2026-06-05 10:00:00', '2026-06-05 11:34:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Kung Fu Panda 4'), (SELECT r.id FROM rooms r JOIN cinemas c ON c.id=r.cinema_id WHERE c.name='Cinestar Quốc Thanh' AND r.name='Phòng 1 - 2D' LIMIT 1), '2026-06-06', 3, '2026-06-06 09:30:00', '2026-06-06 11:04:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Kung Fu Panda 4'), (SELECT r.id FROM rooms r JOIN cinemas c ON c.id=r.cinema_id WHERE c.name='Galaxy Long Xuyên' AND r.name='Phòng A - 2D' LIMIT 1), '2026-06-07', 3, '2026-06-07 15:00:00', '2026-06-07 16:34:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Exhuma'), 13, '2026-06-05', 2, '2026-06-05 21:00:00', '2026-06-05 23:14:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Exhuma'), 22, '2026-06-06', 3, '2026-06-06 20:30:00', '2026-06-06 22:44:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Exhuma'), (SELECT r.id FROM rooms r JOIN cinemas c ON c.id=r.cinema_id WHERE c.name='Cinestar Quốc Thanh' AND r.name='Phòng 2 - 3D' LIMIT 1), '2026-06-08', 3, '2026-06-08 19:00:00', '2026-06-08 21:14:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Civil War'), 11, '2026-06-06', 3, '2026-06-06 18:00:00', '2026-06-06 19:49:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Civil War'), 19, '2026-06-07', 3, '2026-06-07 20:00:00', '2026-06-07 21:49:00', 'OPEN'),
((SELECT id FROM movies WHERE title='A Quiet Place: Day One'), 14, '2026-06-09', 3, '2026-06-09 21:30:00', '2026-06-09 23:09:00', 'OPEN'),
((SELECT id FROM movies WHERE title='A Quiet Place: Day One'), 23, '2026-06-10', 3, '2026-06-10 21:00:00', '2026-06-10 22:39:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Detective Conan: The Million-dollar Pentagram'), 1, '2026-06-08', 3, '2026-06-08 13:30:00', '2026-06-08 15:21:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Detective Conan: The Million-dollar Pentagram'), 6, '2026-06-09', 3, '2026-06-09 16:00:00', '2026-06-09 17:51:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Móng Vuốt'), 20, '2026-06-08', 3, '2026-06-08 20:30:00', '2026-06-08 22:06:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Móng Vuốt'), (SELECT r.id FROM rooms r JOIN cinemas c ON c.id=r.cinema_id WHERE c.name='Galaxy Long Xuyên' AND r.name='Phòng B - 3D' LIMIT 1), '2026-06-09', 3, '2026-06-09 20:00:00', '2026-06-09 21:36:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Doraemon: Nobita và Bản Giao Hưởng Địa Cầu'), 24, '2026-06-06', 3, '2026-06-06 09:00:00', '2026-06-06 10:55:00', 'OPEN'),
((SELECT id FROM movies WHERE title='Doraemon: Nobita và Bản Giao Hưởng Địa Cầu'), (SELECT r.id FROM rooms r JOIN cinemas c ON c.id=r.cinema_id WHERE c.name='CGV Sense City Cần Thơ' AND r.name='Phòng 1 - 2D' LIMIT 1), '2026-06-07', 3, '2026-06-07 10:00:00', '2026-06-07 11:55:00', 'OPEN');

INSERT INTO showtime_seat_prices(showtime_id, seat_type, price)
SELECT s.id, 'NORMAL',
       CASE r.room_type WHEN '2D' THEN 75000 WHEN '3D' THEN 90000 WHEN 'IMAX' THEN 120000 WHEN '4DX' THEN 130000 END
FROM showtimes s
JOIN rooms r ON r.id = s.room_id
WHERE NOT EXISTS (SELECT 1 FROM showtime_seat_prices p WHERE p.showtime_id = s.id AND p.seat_type='NORMAL');

INSERT INTO showtime_seat_prices(showtime_id, seat_type, price)
SELECT s.id, 'VIP',
       CASE r.room_type WHEN '2D' THEN 110000 WHEN '3D' THEN 130000 WHEN 'IMAX' THEN 160000 WHEN '4DX' THEN 170000 END
FROM showtimes s
JOIN rooms r ON r.id = s.room_id
WHERE NOT EXISTS (SELECT 1 FROM showtime_seat_prices p WHERE p.showtime_id = s.id AND p.seat_type='VIP');

INSERT INTO showtime_seat_prices(showtime_id, seat_type, price)
SELECT s.id, 'COUPLE',
       CASE r.room_type WHEN '2D' THEN 190000 WHEN '3D' THEN 220000 WHEN 'IMAX' THEN 280000 WHEN '4DX' THEN 300000 END
FROM showtimes s
JOIN rooms r ON r.id = s.room_id
WHERE NOT EXISTS (SELECT 1 FROM showtime_seat_prices p WHERE p.showtime_id = s.id AND p.seat_type='COUPLE');

-- =====================================================
-- 5) THÊM USER + ROLE CUSTOMER
-- =====================================================

INSERT INTO users(full_name, email, phone, password_hash, status) VALUES
('Nguyen Minh Quan', 'quan@gmail.com', '0931000001', '123456', 'ACTIVE'),
('Tran Ngoc Anh', 'ngocanh@gmail.com', '0931000002', '123456', 'ACTIVE'),
('Le Hoai Nam', 'hoainam@gmail.com', '0931000003', '123456', 'ACTIVE'),
('Pham My Linh', 'mylinh@gmail.com', '0931000004', '123456', 'ACTIVE'),
('Do Thanh Dat', 'dat@gmail.com', '0931000005', '123456', 'ACTIVE'),
('Vo Gia Bao', 'giabao@gmail.com', '0931000006', '123456', 'BLOCKED'),
('Dang Bao Ngoc', 'baongoc@gmail.com', '0931000007', '123456', 'ACTIVE'),
('Bui Quang Huy', 'quanghuy@gmail.com', '0931000008', '123456', 'ACTIVE');

INSERT INTO user_roles(user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'CUSTOMER'
WHERE u.email IN ('quan@gmail.com','ngocanh@gmail.com','hoainam@gmail.com','mylinh@gmail.com','dat@gmail.com','giabao@gmail.com','baongoc@gmail.com','quanghuy@gmail.com')
  AND NOT EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

-- =====================================================
-- 6) THÊM BOOKING + GHẾ + VÉ + THANH TOÁN + ĐỒ ĂN
-- =====================================================

INSERT INTO bookings(user_id, showtime_id, booking_code, total_amount, booking_status) VALUES
((SELECT id FROM users WHERE email='quan@gmail.com'), (SELECT id FROM showtimes WHERE movie_id=(SELECT id FROM movies WHERE title='Godzilla x Kong: The New Empire') AND start_time='2026-06-05 19:00:00' LIMIT 1), 'BK006', 320000, 'CONFIRMED'),
((SELECT id FROM users WHERE email='ngocanh@gmail.com'), (SELECT id FROM showtimes WHERE movie_id=(SELECT id FROM movies WHERE title='Kung Fu Panda 4') AND start_time='2026-06-05 10:00:00' LIMIT 1), 'BK007', 150000, 'CONFIRMED'),
((SELECT id FROM users WHERE email='hoainam@gmail.com'), (SELECT id FROM showtimes WHERE movie_id=(SELECT id FROM movies WHERE title='Exhuma') AND start_time='2026-06-05 21:00:00' LIMIT 1), 'BK008', 220000, 'PENDING'),
((SELECT id FROM users WHERE email='mylinh@gmail.com'), (SELECT id FROM showtimes WHERE movie_id=(SELECT id FROM movies WHERE title='Doraemon: Nobita và Bản Giao Hưởng Địa Cầu') AND start_time='2026-06-06 09:00:00' LIMIT 1), 'BK009', 190000, 'CONFIRMED'),
((SELECT id FROM users WHERE email='dat@gmail.com'), (SELECT id FROM showtimes WHERE movie_id=(SELECT id FROM movies WHERE title='Civil War') AND start_time='2026-06-06 18:00:00' LIMIT 1), 'BK010', 260000, 'CANCELLED');

INSERT INTO booking_seats(booking_id, seat_id, price) VALUES
((SELECT id FROM bookings WHERE booking_code='BK006'), (SELECT st.id FROM showtimes sh JOIN seats st ON st.room_id=sh.room_id WHERE sh.id=(SELECT showtime_id FROM bookings WHERE booking_code='BK006') AND st.seat_row='E' AND st.seat_number=7 LIMIT 1), 160000),
((SELECT id FROM bookings WHERE booking_code='BK006'), (SELECT st.id FROM showtimes sh JOIN seats st ON st.room_id=sh.room_id WHERE sh.id=(SELECT showtime_id FROM bookings WHERE booking_code='BK006') AND st.seat_row='E' AND st.seat_number=8 LIMIT 1), 160000);

INSERT INTO booking_seats(booking_id, seat_id, price) VALUES
((SELECT id FROM bookings WHERE booking_code='BK007'), (SELECT st.id FROM showtimes sh JOIN seats st ON st.room_id=sh.room_id WHERE sh.id=(SELECT showtime_id FROM bookings WHERE booking_code='BK007') AND st.seat_row='B' AND st.seat_number=3 LIMIT 1), 75000),
((SELECT id FROM bookings WHERE booking_code='BK007'), (SELECT st.id FROM showtimes sh JOIN seats st ON st.room_id=sh.room_id WHERE sh.id=(SELECT showtime_id FROM bookings WHERE booking_code='BK007') AND st.seat_row='B' AND st.seat_number=4 LIMIT 1), 75000);

INSERT INTO booking_seats(booking_id, seat_id, price) VALUES
((SELECT id FROM bookings WHERE booking_code='BK008'), (SELECT st.id FROM showtimes sh JOIN seats st ON st.room_id=sh.room_id WHERE sh.id=(SELECT showtime_id FROM bookings WHERE booking_code='BK008') AND st.seat_row='D' AND st.seat_number=5 LIMIT 1), 110000),
((SELECT id FROM bookings WHERE booking_code='BK008'), (SELECT st.id FROM showtimes sh JOIN seats st ON st.room_id=sh.room_id WHERE sh.id=(SELECT showtime_id FROM bookings WHERE booking_code='BK008') AND st.seat_row='D' AND st.seat_number=6 LIMIT 1), 110000);

INSERT INTO tickets(booking_id, qr_code, checked_in) VALUES
((SELECT id FROM bookings WHERE booking_code='BK006'), 'QR-BK006-001', FALSE),
((SELECT id FROM bookings WHERE booking_code='BK006'), 'QR-BK006-002', FALSE),
((SELECT id FROM bookings WHERE booking_code='BK007'), 'QR-BK007-001', FALSE),
((SELECT id FROM bookings WHERE booking_code='BK007'), 'QR-BK007-002', FALSE),
((SELECT id FROM bookings WHERE booking_code='BK008'), 'QR-BK008-001', FALSE),
((SELECT id FROM bookings WHERE booking_code='BK008'), 'QR-BK008-002', FALSE),
((SELECT id FROM bookings WHERE booking_code='BK009'), 'QR-BK009-001', FALSE),
((SELECT id FROM bookings WHERE booking_code='BK010'), 'QR-BK010-001', FALSE);

INSERT INTO payments(booking_id, payment_method, amount, payment_status) VALUES
((SELECT id FROM bookings WHERE booking_code='BK006'), 'VNPAY', 320000, 'SUCCESS'),
((SELECT id FROM bookings WHERE booking_code='BK007'), 'MOMO', 150000, 'SUCCESS'),
((SELECT id FROM bookings WHERE booking_code='BK008'), 'ZALOPAY', 220000, 'PENDING'),
((SELECT id FROM bookings WHERE booking_code='BK009'), 'CASH', 190000, 'SUCCESS'),
((SELECT id FROM bookings WHERE booking_code='BK010'), 'MOMO', 260000, 'FAILED');

INSERT INTO booking_foods(booking_id, food_id, size_name, quantity, unit_price) VALUES
((SELECT id FROM bookings WHERE booking_code='BK006'), 9, 'M', 1, 179000),
((SELECT id FROM bookings WHERE booking_code='BK006'), 3, 'M', 2, 30000),
((SELECT id FROM bookings WHERE booking_code='BK007'), 1, 'M', 1, 65000),
((SELECT id FROM bookings WHERE booking_code='BK008'), 6, 'M', 2, 50000),
((SELECT id FROM bookings WHERE booking_code='BK009'), 8, 'M', 1, 99000);

-- =====================================================
-- 7) THÊM ĐỒ ĂN, SIZE, KHUYẾN MÃI
-- =====================================================

INSERT INTO foods(category_id, name, description, image_url) VALUES
(2, 'Trà Đào', 'Trà đào mát lạnh', 'tra_dao.jpg'),
(2, 'Nước Suối', 'Nước suối đóng chai', 'nuoc_suoi.jpg'),
(3, 'Gà Viên Chiên', 'Gà viên chiên giòn dùng kèm tương ớt', 'ga_vien.jpg'),
(4, 'Combo Family', '2 bắp L + 4 nước M + 2 snack', 'combo_family.jpg');

INSERT INTO food_sizes(food_id, size_name, price) VALUES
((SELECT id FROM foods WHERE name='Trà Đào' LIMIT 1), 'M', 35000),
((SELECT id FROM foods WHERE name='Trà Đào' LIMIT 1), 'L', 45000),
((SELECT id FROM foods WHERE name='Nước Suối' LIMIT 1), 'S', 15000),
((SELECT id FROM foods WHERE name='Nước Suối' LIMIT 1), 'M', 20000),
((SELECT id FROM foods WHERE name='Gà Viên Chiên' LIMIT 1), 'M', 55000),
((SELECT id FROM foods WHERE name='Gà Viên Chiên' LIMIT 1), 'L', 75000),
((SELECT id FROM foods WHERE name='Combo Family' LIMIT 1), 'M', 249000);

INSERT INTO promotions(code, name, discount_type, discount_value, min_amount, expire_date, is_active) VALUES
('WEEKDAY25', 'Giảm 25% ngày thường', 'PERCENT', 25, 180000, '2026-09-30', TRUE),
('STUDENT30K', 'Ưu đãi học sinh sinh viên 30K', 'FIXED', 30000, 100000, '2026-12-31', TRUE),
('FAMILY80K', 'Giảm 80K combo gia đình', 'FIXED', 80000, 300000, '2026-08-31', TRUE),
('IMAX15', 'Giảm 15% vé IMAX', 'PERCENT', 15, 200000, '2026-07-31', TRUE);

INSERT INTO booking_promotions(booking_id, promotion_id, discount_amount) VALUES
((SELECT id FROM bookings WHERE booking_code='BK006'), (SELECT id FROM promotions WHERE code='IMAX15'), 48000),
((SELECT id FROM bookings WHERE booking_code='BK007'), (SELECT id FROM promotions WHERE code='STUDENT30K'), 30000),
((SELECT id FROM bookings WHERE booking_code='BK009'), (SELECT id FROM promotions WHERE code='WELCOME'), 30000);

-- =====================================================
-- 8) KIỂM TRA SAU KHI ĐỔ THÊM DATA
-- =====================================================

SELECT '=== EXTRA DATA SUMMARY ===' AS '';
SELECT CONCAT('Cinemas : ', COUNT(*)) AS summary FROM cinemas;
SELECT CONCAT('Rooms   : ', COUNT(*)) AS summary FROM rooms;
SELECT CONCAT('Seats   : ', COUNT(*)) AS summary FROM seats;
SELECT CONCAT('Movies  : ', COUNT(*)) AS summary FROM movies;
SELECT CONCAT('Showtime: ', COUNT(*)) AS summary FROM showtimes;
SELECT CONCAT('Users   : ', COUNT(*)) AS summary FROM users;
SELECT CONCAT('Bookings: ', COUNT(*)) AS summary FROM bookings;
SELECT CONCAT('Payments: ', COUNT(*)) AS summary FROM payments;
SELECT CONCAT('Foods   : ', COUNT(*)) AS summary FROM foods;
SELECT CONCAT('Promos  : ', COUNT(*)) AS summary FROM promotions;
-- =====================================================
-- VIP MEMBERSHIP SYSTEM — Cinema Booking
-- Tính năng:
--   · 4 hạng thành viên theo tổng chi tiêu
--   · Ưu đãi riêng từng hạng (giảm giá, quà tặng, ưu tiên đặt vé)
--   · Tự động nâng/hạ hạng sau mỗi giao dịch
--   · Lịch sử thay đổi hạng
--   · Tích điểm thưởng
-- MySQL 8.0+
-- =====================================================

USE cinema_booking;

-- =====================================================
-- MEMBERSHIP TIERS — định nghĩa các hạng VIP
-- =====================================================

CREATE TABLE membership_tiers (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    name                VARCHAR(50)   NOT NULL,               -- STANDARD / SILVER / GOLD / PLATINUM
    tier_level          TINYINT       NOT NULL UNIQUE,        -- 0 / 1 / 2 / 3 (để so sánh thứ bậc)
    min_spend           BIGINT        NOT NULL DEFAULT 0,     -- Tổng chi tiêu tối thiểu (VNĐ)
    max_spend           BIGINT,                               -- NULL = không giới hạn trên
    discount_percent    TINYINT       NOT NULL DEFAULT 0,     -- % giảm giá trên giá vé
    point_multiplier    DECIMAL(3,1)  NOT NULL DEFAULT 1.0,   -- Hệ số nhân điểm tích lũy
    color_hex           VARCHAR(7)    NOT NULL DEFAULT '#888888',
    icon_url            VARCHAR(500),
    description         TEXT
);

INSERT INTO membership_tiers
    (name, tier_level, min_spend, max_spend, discount_percent, point_multiplier, color_hex, description)
VALUES
    ('Thành viên',  0,         0,       999999,  0,  1.0, '#9E9E9E', 'Hạng mặc định khi đăng ký tài khoản'),
    ('Silver',      1,   1000000,  4999999,  5,  1.5, '#78909C', 'Chi tiêu từ 1 triệu — giảm 5% giá vé'),
    ('Gold',        2,   5000000, 19999999, 10,  2.0, '#FFB300', 'Chi tiêu từ 5 triệu — giảm 10% + ưu đãi combo'),
    ('Platinum',    3,  20000000,     NULL, 15,  3.0, '#7B1FA2', 'Chi tiêu từ 20 triệu — giảm 15% + đặt vé ưu tiên + quà sinh nhật');

-- =====================================================
-- MEMBERSHIP BENEFITS — ưu đãi chi tiết từng hạng
-- =====================================================

CREATE TABLE membership_benefits (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    tier_id     INT          NOT NULL,
    benefit_key VARCHAR(50)  NOT NULL,   -- DISCOUNT_TICKET / FREE_COMBO / PRIORITY_BOOKING / BIRTHDAY_GIFT / FREE_UPGRADE_SEAT
    label       VARCHAR(100) NOT NULL,   -- Mô tả hiển thị cho user
    value       VARCHAR(100),            -- Giá trị cụ thể nếu có (vd: "1 combo/tháng")
    FOREIGN KEY (tier_id) REFERENCES membership_tiers(id) ON DELETE CASCADE
);

INSERT INTO membership_benefits (tier_id, benefit_key, label, value) VALUES
-- Silver
(2, 'DISCOUNT_TICKET',    'Giảm giá vé',                    '5%'),
(2, 'FREE_POPCORN',       'Bỏng ngô miễn phí',              '1 lần/tháng'),
-- Gold
(3, 'DISCOUNT_TICKET',    'Giảm giá vé',                    '10%'),
(3, 'FREE_COMBO',         'Combo bắp + nước miễn phí',      '1 lần/tháng'),
(3, 'PRIORITY_BOOKING',   'Đặt vé sớm hơn 30 phút',         NULL),
-- Platinum
(4, 'DISCOUNT_TICKET',    'Giảm giá vé',                    '15%'),
(4, 'FREE_COMBO',         'Combo cao cấp miễn phí',          '2 lần/tháng'),
(4, 'PRIORITY_BOOKING',   'Đặt vé sớm hơn 2 tiếng',         NULL),
(4, 'FREE_UPGRADE_SEAT',  'Nâng hạng ghế VIP miễn phí',     '2 lần/tháng'),
(4, 'BIRTHDAY_GIFT',      'Quà tặng sinh nhật',              '2 vé miễn phí'),
(4, 'LOUNGE_ACCESS',      'Phòng chờ VIP',                   NULL);

-- =====================================================
-- USER MEMBERSHIPS — trạng thái membership của từng user
-- =====================================================

CREATE TABLE user_memberships (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id             BIGINT        NOT NULL UNIQUE,
    tier_id             INT           NOT NULL,
    total_spend         BIGINT        NOT NULL DEFAULT 0,    -- Tổng chi tiêu tích lũy (VNĐ)
    points              INT           NOT NULL DEFAULT 0,    -- Điểm thưởng hiện tại
    points_used         INT           NOT NULL DEFAULT 0,    -- Điểm đã dùng
    monthly_benefits    JSON,                                -- Theo dõi benefit đã dùng trong tháng
    tier_updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tier_id) REFERENCES membership_tiers(id)
);

-- =====================================================
-- MEMBERSHIP TIER HISTORY — lịch sử thay đổi hạng
-- =====================================================

CREATE TABLE membership_tier_history (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT   NOT NULL,
    old_tier_id     INT,
    new_tier_id     INT      NOT NULL,
    reason          ENUM('UPGRADE','DOWNGRADE','INIT') NOT NULL DEFAULT 'INIT',
    total_spend_at  BIGINT   NOT NULL DEFAULT 0,
    changed_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (old_tier_id) REFERENCES membership_tiers(id),
    FOREIGN KEY (new_tier_id) REFERENCES membership_tiers(id)
);

-- =====================================================
-- MEMBERSHIP BENEFIT USAGE — theo dõi benefit đã dùng
-- =====================================================

CREATE TABLE membership_benefit_usage (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT       NOT NULL,
    benefit_key     VARCHAR(50)  NOT NULL,
    booking_id      BIGINT,
    used_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- =====================================================
-- ALTER bookings — lưu discount từ membership
-- =====================================================

ALTER TABLE bookings
    ADD COLUMN membership_discount   INT     NOT NULL DEFAULT 0  AFTER total_amount,
    ADD COLUMN points_earned         INT     NOT NULL DEFAULT 0  AFTER membership_discount,
    ADD COLUMN points_used           INT     NOT NULL DEFAULT 0  AFTER points_earned;

-- =====================================================
-- TRIGGER: Tự động khởi tạo membership khi user đăng ký
-- =====================================================

DELIMITER $$

CREATE TRIGGER trg_init_membership
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_memberships (user_id, tier_id, total_spend, points)
    VALUES (NEW.id, 1, 0, 0);

    INSERT INTO membership_tier_history (user_id, old_tier_id, new_tier_id, reason, total_spend_at)
    VALUES (NEW.id, NULL, 1, 'INIT', 0);
END$$

-- =====================================================
-- TRIGGER: Tự động cập nhật tier sau khi thanh toán thành công
-- =====================================================

CREATE TRIGGER trg_update_membership_on_payment
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    DECLARE v_user_id       BIGINT;
    DECLARE v_booking_total BIGINT;
    DECLARE v_old_tier      INT;
    DECLARE v_new_tier      INT;
    DECLARE v_total_spend   BIGINT;
    DECLARE v_multiplier    DECIMAL(3,1);
    DECLARE v_points        INT;

    -- Chỉ xử lý khi payment SUCCESS
    IF NEW.payment_status = 'SUCCESS' THEN

        -- Lấy thông tin booking
        SELECT b.user_id, b.total_amount
        INTO v_user_id, v_booking_total
        FROM bookings b WHERE b.id = NEW.booking_id LIMIT 1;

        -- Lấy tier hiện tại
        SELECT tier_id, total_spend INTO v_old_tier, v_total_spend
        FROM user_memberships WHERE user_id = v_user_id LIMIT 1;

        -- Cộng chi tiêu
        SET v_total_spend = v_total_spend + v_booking_total;

        -- Xác định tier mới
        SELECT id INTO v_new_tier
        FROM membership_tiers
        WHERE min_spend <= v_total_spend
          AND (max_spend IS NULL OR max_spend >= v_total_spend)
        ORDER BY tier_level DESC LIMIT 1;

        -- Tính điểm (10,000đ = 1 điểm, nhân theo hệ số tier)
        SELECT point_multiplier INTO v_multiplier
        FROM membership_tiers WHERE id = v_new_tier LIMIT 1;

        SET v_points = FLOOR((v_booking_total / 10000) * v_multiplier);

        -- Cập nhật user_memberships
        UPDATE user_memberships
        SET total_spend     = v_total_spend,
            tier_id         = v_new_tier,
            points          = points + v_points,
            tier_updated_at = IF(v_new_tier != v_old_tier, NOW(), tier_updated_at)
        WHERE user_id = v_user_id;

        -- Ghi lịch sử nếu có thay đổi tier
        IF v_new_tier != v_old_tier THEN
            INSERT INTO membership_tier_history
                (user_id, old_tier_id, new_tier_id, reason, total_spend_at)
            VALUES (
                v_user_id,
                v_old_tier,
                v_new_tier,
                IF(v_new_tier > v_old_tier, 'UPGRADE', 'DOWNGRADE'),
                v_total_spend
            );
        END IF;

        -- Lưu điểm tích lũy vào booking
        UPDATE bookings SET points_earned = v_points WHERE id = NEW.booking_id;

    END IF;
END$$

DELIMITER ;

-- =====================================================
-- INDEX tối ưu truy vấn
-- =====================================================

CREATE INDEX idx_user_memberships_user    ON user_memberships(user_id);
CREATE INDEX idx_user_memberships_tier    ON user_memberships(tier_id);
CREATE INDEX idx_tier_history_user        ON membership_tier_history(user_id);
CREATE INDEX idx_benefit_usage_user       ON membership_benefit_usage(user_id, benefit_key);
USE cinema_booking;

SET SQL_SAFE_UPDATES = 0;  -- ← disable safe mode

UPDATE foods
SET description = '1 bắp caramel M + 1 nước M',
    image_url = 'combo1.jpg'
WHERE name = 'Combo 1';

UPDATE foods
SET description = '1 bắp phô mai M + 1 bắp caramel M + 2 nước M',
    image_url = 'combo2.jpg'
WHERE name = 'Combo 2';

-- ... rest of your INSERTs and UPDATEs ...

UPDATE foods
SET description = '2 bắp L vị caramel/phô mai + 4 nước M + 2 snack',
    image_url = 'combo_family.jpg'
WHERE name = 'Combo Family';

SET SQL_SAFE_UPDATES = 1;  -- ← re-enable safe mode
USE cinema_booking;

ALTER TABLE users
  ADD COLUMN birth_date DATE NULL AFTER phone;

ALTER TABLE pending_users
  ADD COLUMN birth_date DATE NULL AFTER phone;

UPDATE users
SET birth_date = '2000-01-01'
WHERE birth_date IS NULL;

ALTER TABLE movies
  ADD COLUMN age_rating VARCHAR(10) NOT NULL DEFAULT 'T13' AFTER language;

UPDATE movies
SET age_rating = CASE
  WHEN title LIKE '%Frozen%' THEN 'P'
  WHEN title LIKE '%Inside Out%' THEN 'P'
  WHEN title LIKE '%Doraemon%' THEN 'P'
  WHEN title LIKE '%Conjuring%' THEN 'T18'
  WHEN title LIKE '%Quiet Place%' THEN 'T16'
  WHEN title LIKE '%Batman%' THEN 'T16'
  WHEN title LIKE '%Deadpool%' THEN 'T18'
  ELSE 'T13'
END;
