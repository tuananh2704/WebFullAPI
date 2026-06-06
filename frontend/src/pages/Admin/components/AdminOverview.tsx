import React from "react";
import { formatCurrency } from "../../../utils/format";

interface AdminOverviewProps {
  stats: any;
  maxMonthlyRevenue: number;
}

const AdminOverview: React.FC<AdminOverviewProps> = ({ stats, maxMonthlyRevenue }) => {
  return (
    <>
      <div className="stats-grid admin-stats">
        <div className="data-card admin-stat-card">
          <div className="stat-icon" style={{ color: "#ff4d4f" }}>
            🎬
          </div>
          <h2>{stats?.total_movies || 0}</h2>
          <p>Phim</p>
        </div>
        <div className="data-card admin-stat-card">
          <div className="stat-icon" style={{ color: "#52c41a" }}>
            🎟️
          </div>
          <h2>{stats?.total_bookings || 0}</h2>
          <p>Đơn hàng</p>
        </div>
        <div className="data-card admin-stat-card">
          <div className="stat-icon" style={{ color: "#1890ff" }}>
            👥
          </div>
          <h2>{stats?.total_users || 0}</h2>
          <p>Người dùng</p>
        </div>
        <div className="data-card admin-stat-card">
          <div className="stat-icon" style={{ color: "#faad14" }}>
            💰
          </div>
          <h2>{formatCurrency(stats?.total_revenue || 0)}</h2>
          <p>Doanh thu</p>
        </div>
      </div>

      <div className="admin-dashboard-grid">
        <div className="data-card admin-chart-card">
          <h2>Doanh thu theo tháng</h2>
          <div className="revenue-chart">
            {(stats?.monthly_revenue || []).map((item: any) => (
              <div className="revenue-bar-item" key={item.month}>
                <div className="revenue-bar-track">
                  <span
                    style={{
                      height: `${Math.max((Number(item.revenue) / maxMonthlyRevenue) * 100, 6)}%`,
                    }}
                  />
                </div>
                <small>{item.month}</small>
                <strong>{formatCurrency(item.revenue)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="data-card admin-chart-card">
          <h2>Hiệu suất đặt vé</h2>
          <div className="status-stack">
            {(stats?.booking_status || []).map((item: any) => {
              const total = Number(stats?.total_bookings || 1);
              const percent = Math.round((Number(item.total) / total) * 100);
              return (
                <div className="status-meter" key={item.status}>
                  <div>
                    <span>{item.status}</span>
                    <strong>{item.total} đơn</strong>
                  </div>
                  <div className="status-track">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="data-card admin-chart-card">
          <h2>Top phim theo đơn hàng</h2>
          <div className="stack">
            {(stats?.top_movies || []).map((movie: any, index: number) => (
              <div className="rank-row" key={movie.id}>
                <span>{index + 1}</span>
                <strong>{movie.title}</strong>
                <em>{movie.total_bookings} đơn</em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminOverview;
