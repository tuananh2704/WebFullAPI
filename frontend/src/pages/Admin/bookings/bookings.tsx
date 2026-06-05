import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { notification } from "antd";
import type { AdminBooking } from "../../../services/adminService";
import { formatCurrency, formatDateTime } from "../../../utils/format";

type BookingFilters = {
  search: string;
  status: "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED";
  date_from: string;
  date_to: string;
  page: number;
  limit: number;
};

type BookingsSectionProps = {
  bookings: AdminBooking[];
  total: number;
  filters: BookingFilters;
  onBookingFilterChange: (updates: Partial<BookingFilters>) => void;
  handleBookingStatus: (
    bookingId: number,
    status: AdminBooking["booking_status"]
  ) => Promise<void> | void;
  handleApproveAllBookings: () => Promise<void> | void;
};

const cellStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const BookingsSection: React.FC<BookingsSectionProps> = ({
  bookings,
  total,
  filters,
  onBookingFilterChange,
  handleBookingStatus,
  handleApproveAllBookings,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const pendingCount = bookings.filter((booking) => booking.booking_status === "PENDING").length;
  const canApproveAll =
    filters.status === "ALL" || filters.status === "PENDING" || pendingCount > 0;

  return (
    <div
      className="admin-table-card"
      style={{
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        className="admin-filter-row"
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <input
          type="text"
          placeholder="Tìm mã hoặc tên khách"
          value={filters.search}
          onChange={(e) =>
            onBookingFilterChange({ search: e.target.value, page: 1 })
          }
        />

        <select
          value={filters.status}
          onChange={(e) =>
            onBookingFilterChange({ status: e.target.value as any, page: 1 })
          }
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
          Từ
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) =>
              onBookingFilterChange({ date_from: e.target.value, page: 1 })
            }
          />
        </label>

        <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
          Đến
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) =>
              onBookingFilterChange({ date_to: e.target.value, page: 1 })
            }
          />
        </label>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h2>Xác nhận đơn hàng</h2>
          <span>Tổng đơn: {total}</span>
        </div>

        <button
          type="button"
          className="secondary-btn compact"
          disabled={!canApproveAll}
          onClick={async () => {
            try {
              await handleApproveAllBookings();
            } catch (error: any) {
              notification.error({
                message: "Lỗi duyệt tất cả",
                description: error.response?.data?.message || "Không thể duyệt tất cả đơn hàng.",
              });
            }
          }}
        >
          Duyệt tất cả
        </button>
      </div>

      <div
        className="admin-table"
        style={{
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          boxSizing: "border-box",
        }}
      >
        {(bookings ?? []).map((booking) => (
          <div
            className="admin-table-row booking-admin-row"
            key={booking.id}
            style={{
              width: "100%",
              minWidth: "760px",
              boxSizing: "border-box",
              display: "grid",
              alignItems: "center",
              gap: "12px",
              gridTemplateColumns:
                "0.8fr 1.2fr 1.6fr 1.2fr 1fr 1fr 40px 40px",
            }}
          >
            <strong style={cellStyle}>{booking.booking_code}</strong>

            <span style={cellStyle}>
              {booking.customer_name || booking.customer_email || "Khách hàng"}
            </span>

            <span style={cellStyle}>{booking.movie_title}</span>

            <span style={cellStyle}>{formatDateTime(booking.start_time)}</span>

            <span style={cellStyle}>
              {formatCurrency(booking.total_amount)}
            </span>

            <span
              className={`admin-status-pill ${booking.booking_status.toLowerCase()}`}
              style={{
                ...cellStyle,
                justifySelf: "start",
                maxWidth: "100%",
              }}
            >
              {booking.booking_status}
            </span>

            <button
              title="Xác nhận đơn"
              disabled={booking.booking_status !== "PENDING"}
              onClick={() => handleBookingStatus(booking.id, "CONFIRMED")}
              style={{
                width: "36px",
                height: "36px",
                minWidth: "36px",
                justifySelf: "center",
              }}
            >
              <CheckCircle2 size={16} />
            </button>

            <button
              title="Hủy đơn"
              disabled={booking.booking_status !== "PENDING"}
              onClick={() => handleBookingStatus(booking.id, "CANCELLED")}
              style={{
                width: "36px",
                height: "36px",
                minWidth: "36px",
                justifySelf: "center",
              }}
            >
              <XCircle size={16} />
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span>
          Trang {filters.page} / {totalPages}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="secondary-btn compact"
            type="button"
            disabled={filters.page <= 1}
            onClick={() =>
              onBookingFilterChange({ page: Math.max(1, filters.page - 1) })
            }
          >
            Prev
          </button>
          <button
            className="secondary-btn compact"
            type="button"
            disabled={filters.page >= totalPages}
            onClick={() =>
              onBookingFilterChange({
                page: Math.min(totalPages, filters.page + 1),
              })
            }
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingsSection;
