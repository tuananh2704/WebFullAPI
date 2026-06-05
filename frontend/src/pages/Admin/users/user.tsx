import React from "react";
import { Modal } from "antd";
import { Eye, Lock, Unlock } from "lucide-react";
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
  onDeleteUser?: (userId: number) => Promise<void> | void;
} & UserModalData;

const getStatus = (user?: AdminUser | null) => user?.is_active || user?.status || "ACTIVE";

const UsersSection: React.FC<UsersSectionProps> = ({
  users,
  userFilters,
  onUserFilterChange,
  onUserStatusChange,
  onViewUserDetail,
  selectedUser,
  isUserModalVisible,
  setIsUserModalVisible,
}) => {
  return (
    <div className="admin-users-section">
      <div className="data-card users-admin-card">
        <div className="section-header users-section-header">
          <div>
            <h2>Quản lý người dùng</h2>
            <p className="muted">Theo dõi tài khoản, trạng thái và thông tin liên hệ.</p>
          </div>

          <input
            type="text"
            placeholder="Tìm tên, email, số điện thoại..."
            value={userFilters.search}
            onChange={(e) => onUserFilterChange({ search: e.target.value })}
            className="admin-filter-input users-search-input"
          />
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

                  <strong className="user-name-cell" title={user.full_name}>
                    {user.full_name}
                  </strong>

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
            <strong>Trạng thái</strong>
            <span className={getStatus(selectedUser) === "ACTIVE" ? "status-text-active" : "status-text-locked"}>
              {getStatus(selectedUser) === "ACTIVE" ? "Hoạt động" : "Bị khóa"}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersSection;
