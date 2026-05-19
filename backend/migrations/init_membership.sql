-- =====================================================
-- MIGRATION: Khởi tạo membership cho các user đã tồn tại
-- Chạy 1 lần sau khi tạo bảng membership
-- =====================================================

USE cinema_booking;

-- Tạo membership cho user chưa có
INSERT INTO user_memberships (user_id, tier_id, total_spend, points)
SELECT u.id, 1, 0, 0
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_memberships um WHERE um.user_id = u.id
);

-- Tạo tier history INIT cho user chưa có
INSERT INTO membership_tier_history (user_id, old_tier_id, new_tier_id, reason, total_spend_at)
SELECT u.id, NULL, 1, 'INIT', 0
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM membership_tier_history mth WHERE mth.user_id = u.id
);

-- Cập nhật total_spend dựa trên bookings đã thanh toán thành công
UPDATE user_memberships um
SET um.total_spend = (
    SELECT COALESCE(SUM(b.total_amount), 0)
    FROM bookings b
    JOIN payments p ON p.booking_id = b.id
    WHERE b.user_id = um.user_id
      AND p.payment_status = 'SUCCESS'
      AND b.booking_status = 'CONFIRMED'
);

-- Cập nhật tier dựa trên total_spend
UPDATE user_memberships um
JOIN membership_tiers mt ON mt.min_spend <= um.total_spend
    AND (mt.max_spend IS NULL OR mt.max_spend >= um.total_spend)
SET um.tier_id = mt.id
WHERE mt.tier_level = (
    SELECT MAX(t2.tier_level)
    FROM membership_tiers t2
    WHERE t2.min_spend <= um.total_spend
      AND (t2.max_spend IS NULL OR t2.max_spend >= um.total_spend)
);

-- Tính điểm cho các booking đã thanh toán
UPDATE user_memberships um
SET um.points = (
    SELECT COALESCE(SUM(
        FLOOR((b.total_amount / 10000) * mt.point_multiplier)
    ), 0)
    FROM bookings b
    JOIN payments p ON p.booking_id = b.id
    JOIN membership_tiers mt ON mt.id = um.tier_id
    WHERE b.user_id = um.user_id
      AND p.payment_status = 'SUCCESS'
      AND b.booking_status = 'CONFIRMED'
);

SELECT '=== MEMBERSHIP MIGRATION DONE ===' AS '';
SELECT um.user_id, u.full_name, mt.name AS tier, um.total_spend, um.points
FROM user_memberships um
JOIN users u ON u.id = um.user_id
JOIN membership_tiers mt ON mt.id = um.tier_id
ORDER BY um.total_spend DESC;
