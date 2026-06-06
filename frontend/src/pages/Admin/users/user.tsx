import React, { useState } from "react";
import { Modal } from "antd";
import { Eye, Gift, Lock, Mail, RefreshCw, Unlock } from "lucide-react";
import type { AdminUser } from "../../../services/adminService";

type UserModalData = {
  selectedUser: AdminUser | null;
  isUserModalVisible: boolean;
  setIsUserModalVisible: (visible: boolean) => void;
};

type UsersSectionProps = {
  users: AdminUser[];
  userFilters: { role: string; search: string };
  onUserFilterChange: (updates: Partial<{ role: string; search: string }>) => Promise<void> | void;
  onUserRoleChange?: (userId: number, newRole: string) => Promise<void> | void;
  onUserStatusChange: (userId: number, status: "ACTIVE" | "BLOCKED") => Promise<void> | void;
  onViewUserDetail: (userId: number) => Promise<void> | void;
  onSendUserVoucher: (
    userId: number,
    payload: { discount_amount: number; scope: "GENERAL" | "VIP" }
  ) => Promise<void> | void;
  onSendBulkVoucher: (payload: { discount_amount: number; code: string }) => Promise<void> | void;
  onDeleteUser?: (userId: number) => Promise<void> | void;
} & UserModalData;

const getStatus = (user?: AdminUser | null) => user?.is_active || user?.status || "ACTIVE";

const getVipLabel = (user?: AdminUser | null) => {
  const tierName = user?.membership_tier_name || "Thành viên";
  const points = Number(user?.membership_points || 0).toLocaleString("vi-VN");
  return `${tierName} · ${points} điểm`;
};

const getVipStyle = (user?: AdminUser | null): React.CSSProperties =>
  ({
    "--vip-color": user?.membership_tier_color || "#9E9E9E",
  } as React.CSSProperties);

const generateVoucherPreviewCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 10; i += 1) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CINE${suffix}`;
};

const UsersSection: React.FC<UsersSectionProps> = ({
  users,
  userFilters,
  onUserFilterChange,
  onUserStatusChange,
  onViewUserDetail,
  onSendUserVoucher,
  onSendBulkVoucher,
  selectedUser,
  isUserModalVisible,
  setIsUserModalVisible,
}) => {
  const [voucherUser, setVoucherUser] = useState<AdminUser | null>(null);
  const [voucherAmount, setVoucherAmount] = useState("50000");
  const [bulkVoucherOpen, setBulkVoucherOpen] = useState(false);
  const [bulkVoucherAmount, setBulkVoucherAmount] = useState("50000");
  const [bulkVoucherCode, setBulkVoucherCode] = useState(generateVoucherPreviewCode);

  const closeVoucherModal = () => {
    setVoucherUser(null);
    setVoucherAmount("50000");
  };

  const submitVoucher = async () => {
    if (!voucherUser) return;
    await onSendUserVoucher(voucherUser.id, {
      discount_amount: Number(voucherAmount || 0),
      scope: "VIP",
    });
    closeVoucherModal();
  };

  const closeBulkVoucherModal = () => {
    setBulkVoucherOpen(false);
    setBulkVoucherAmount("50000");
    setBulkVoucherCode(generateVoucherPreviewCode());
  };

  const submitBulkVoucher = async () => {
    await onSendBulkVoucher({
      discount_amount: Number(bulkVoucherAmount || 0),
      code: bulkVoucherCode,
    });
    closeBulkVoucherModal();
  };

  return (
    <div className="admin-users-section">
      <div className="data-card users-admin-card">
        <div className="section-header users-section-header">
          <div>
            <h2>Quản lý người dùng</h2>
            <p className="muted">Theo dõi tài khoản, trạng thái và thông tin liên hệ.</p>
          </div>

          <div className="users-toolbar">
            <button
              type="button"
              className="primary-btn users-bulk-voucher-btn"
              onClick={() => setBulkVoucherOpen(true)}
            >
              <Gift size={18} />
              Tạo voucher chung
            </button>

            <input
              type="text"
              placeholder="Tìm tên, email, số điện thoại..."
              value={userFilters.search}
              onChange={(e) => onUserFilterChange({ search: e.target.value })}
              className="admin-filter-input users-search-input"
            />
          </div>
        </div>

        <div className="users-grid users-grid-head">
          <span>ID</span>
          <span>Người dùng</span>
          <span>Email</span>
          <span>Số điện thoại</span>
          <span>Vai trò</span>
          <span>Trạng thái</span>
          <span>Hành động</span>
        </div>

        <div className="users-grid-list">
          {users.length > 0 ? (
            users.map((user) => {
              const status = getStatus(user);
              const isLocked = status === "BLOCKED";

              return (
                <div className="users-grid users-grid-row" key={user.id}>
                  <span className="user-id-cell">#{user.id}</span>

                  <div className="user-name-stack" title={`${user.full_name} - ${getVipLabel(user)}`}>
                    <strong className="user-name-cell">{user.full_name}</strong>
                    <span className="user-vip-pill" style={getVipStyle(user)}>
                      VIP {getVipLabel(user)}
                    </span>
                  </div>

                  <span className="user-email-cell" title={user.email}>
                    {user.email}
                  </span>

                  <span>{user.phone || "-"}</span>

                  <span className="user-role-pill">{user.roles || "CUSTOMER"}</span>

                  <button
                    type="button"
                    className={`admin-status-pill ${isLocked ? "status-locked" : "status-active"}`}
                    onClick={() => onUserStatusChange(user.id, isLocked ? "ACTIVE" : "BLOCKED")}
                  >
                    {isLocked ? "Bị khóa" : "Hoạt động"}
                  </button>

                  <div className="user-actions">
                    <button
                      className="secondary-btn compact icon-only-btn"
                      type="button"
                      onClick={() => setVoucherUser(user)}
                      title="Gửi voucher"
                      aria-label="Gửi voucher"
                    >
                      <Mail size={16} />
                    </button>

                    <button
                      className="secondary-btn compact"
                      type="button"
                      onClick={() => onViewUserDetail(user.id)}
                      title="Xem chi tiết"
                    >
                      <Eye size={16} />
                      Chi tiết
                    </button>

                    <button
                      className={`secondary-btn compact ${isLocked ? "" : "danger-btn"}`}
                      type="button"
                      onClick={() => onUserStatusChange(user.id, isLocked ? "ACTIVE" : "BLOCKED")}
                      title={isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                    >
                      {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                      {isLocked ? "Mở khóa" : "Khóa"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="users-empty-state">Không tìm thấy người dùng nào.</div>
          )}
        </div>
      </div>

      <Modal
        title="Chi tiết người dùng"
        open={isUserModalVisible}
        onCancel={() => setIsUserModalVisible(false)}
        footer={null}
      >
        <div className="user-detail-modal">
          <div>
            <strong>Họ tên</strong>
            <span>{selectedUser?.full_name}</span>
          </div>

          <div>
            <strong>Email</strong>
            <span>{selectedUser?.email}</span>
          </div>

          <div>
            <strong>Số điện thoại</strong>
            <span>{selectedUser?.phone || "-"}</span>
          </div>

          <div>
            <strong>Vai trò</strong>
            <span>{selectedUser?.roles || "CUSTOMER"}</span>
          </div>

          <div>
            <strong>VIP</strong>
            <span className="user-vip-pill" style={getVipStyle(selectedUser)}>
              VIP {getVipLabel(selectedUser)}
            </span>
          </div>

          <div>
            <strong>Trạng thái</strong>
            <span className={getStatus(selectedUser) === "ACTIVE" ? "status-text-active" : "status-text-locked"}>
              {getStatus(selectedUser) === "ACTIVE" ? "Hoạt động" : "Bị khóa"}
            </span>
          </div>
        </div>
      </Modal>

      <Modal
        title="Gửi voucher cho khách hàng"
        open={Boolean(voucherUser)}
        onCancel={closeVoucherModal}
        onOk={submitVoucher}
        okText="Tạo và gửi"
        cancelText="Hủy"
        width={620}
        className="admin-voucher-modal-shell"
      >
        <div className="admin-voucher-modal">
          <div className="voucher-recipient">
            <strong>{voucherUser?.full_name}</strong>
            <span>{voucherUser?.email}</span>
            <small>VIP {getVipLabel(voucherUser)}</small>
          </div>

          <label>
            <span>Giá trị voucher</span>
            <input
              type="number"
              min={1000}
              step={1000}
              value={voucherAmount}
              onChange={(event) => setVoucherAmount(event.target.value)}
            />
          </label>

          <div className="voucher-scope-card">
            <Gift size={18} />
            <div>
              <strong>Gửi cho VIP</strong>
              <span>Mã chỉ dùng đúng hạng VIP hiện tại của khách hàng này.</span>
            </div>
          </div>

          <p className="muted">
            Mã được tạo tự động, gửi vào thông báo user và hết hạn sau 5 ngày.
          </p>
        </div>
      </Modal>

      <Modal
        title="Tạo voucher chung"
        open={bulkVoucherOpen}
        onCancel={closeBulkVoucherModal}
        onOk={submitBulkVoucher}
        okText="Gửi cho tất cả"
        cancelText="Hủy"
        width={620}
        className="admin-voucher-modal-shell"
      >
        <div className="admin-voucher-modal">
          <div className="voucher-recipient bulk-voucher-recipient">
            <strong>Voucher chung</strong>
            <span>Gửi cho tất cả tài khoản đang hoạt động, trừ ADMIN và tài khoản bị khóa.</span>
            <small>Mỗi tài khoản chỉ dùng mã này 1 lần.</small>
          </div>

          <label>
            <span>Mã voucher tự động</span>
            <div className="voucher-code-input-row">
              <input value={bulkVoucherCode} readOnly />
              <button type="button" onClick={() => setBulkVoucherCode(generateVoucherPreviewCode())}>
                <RefreshCw size={16} />
              </button>
            </div>
          </label>

          <label>
            <span>Giá trị voucher</span>
            <input
              type="number"
              min={1000}
              step={1000}
              value={bulkVoucherAmount}
              onChange={(event) => setBulkVoucherAmount(event.target.value)}
            />
          </label>

          <p className="muted">
            Khi bấm gửi, hệ thống sẽ gửi cùng mã này vào thông báo của toàn bộ tài khoản hợp lệ.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default UsersSection;
