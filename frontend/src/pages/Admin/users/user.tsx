import React from "react";
import { Modal, notification } from "antd";
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
  onUserRoleChange: (userId: number, newRole: string) => Promise<void> | void;
  onUserStatusChange: (userId: number, status: "ACTIVE" | "BLOCKED") => Promise<void> | void;
  onViewUserDetail: (userId: number) => Promise<void> | void;
  onDeleteUser: (userId: number) => Promise<void> | void;
} & UserModalData;

const UsersSection: React.FC<UsersSectionProps> = ({
  users,
  userFilters,
  onUserFilterChange,
  onUserRoleChange,
  onUserStatusChange,
  onViewUserDetail,
  onDeleteUser,
  selectedUser,
  isUserModalVisible,
  setIsUserModalVisible,
}) => {
  return (
    <div className="admin-users-section">
      <div className="data-card">
        <div className="section-header">
          <h2>Quản lý người dùng</h2>

          <div className="filters-group">
            <input
              type="text"
              placeholder="Tìm tên, email..."
              value={userFilters.search}
              onChange={(e) => onUserFilterChange({ search: e.target.value })}
              className="admin-filter-input"
            />

            <select
              value={userFilters.role}
              onChange={(e) => onUserFilterChange({ role: e.target.value })}
              className="admin-filter-select"
            >
              <option value="">Tất cả vai trò</option>
              <option value="CUSTOMER">Customer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="admin-table users-table">
            <colgroup>
              <col style={{ width: "70px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "300px" }} />
              <col style={{ width: "190px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "260px" }} />
            </colgroup>

            <thead>
              <tr>
                <th>ID</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td title={user.full_name}>{user.full_name}</td>
                    <td title={user.email}>{user.email}</td>
                    <td title={user.phone || ""}>{user.phone || "-"}</td>

                    <td>
                      <select
                        value={user.roles}
                        onChange={(e) => onUserRoleChange(user.id, e.target.value)}
                        className="role-select"
                        disabled={user.is_active === "BLOCKED"}
                      >
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    <td>
<button
  className={`admin-status-pill ${
    user.is_active === "ACTIVE"
      ? "status-active"
      : "status-locked"
  }`}
  onClick={() =>
    onUserStatusChange(
      user.id,
      user.is_active === "ACTIVE"
        ? "BLOCKED"
        : "ACTIVE"
    )
  }
>
  {user.is_active === "ACTIVE"
    ? "Hoạt động"
    : "Bị khóa"}
</button>
                    </td>

                    <td>
                      <div className="user-actions">
                        <button
                          className="secondary-btn compact"
                          onClick={() => onViewUserDetail(user.id)}
                        >
                          Chi tiết
                        </button>

                        {user.roles !== "ADMIN" && user.is_active === "BLOCKED" && (
                          <button
                            className="secondary-btn compact danger-btn"
                            onClick={async () => {
                              if (window.confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) {
                                try {
                                  await onDeleteUser(user.id);
                                } catch (e: any) {
                                  notification.error({
                                    message: "Lỗi khi xóa",
                                    description:
                                      e?.response?.data?.message || "Không thể xóa tài khoản.",
                                  });
                                }
                              }
                            }}
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        title="Chi tiết người dùng"
        open={isUserModalVisible}
        onCancel={() => setIsUserModalVisible(false)}
        footer={null}
      >
        <div style={{ display: "grid", gap: "12px", padding: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Họ tên:</strong>
            <span>{selectedUser?.full_name}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Email:</strong>
            <span>{selectedUser?.email}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Số điện thoại:</strong>
            <span>{selectedUser?.phone || "-"}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Vai trò:</strong>
            <span>{selectedUser?.roles}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Trạng thái:</strong>
            <span
              style={{
                color:
                  selectedUser?.is_active === "ACTIVE" ? "#52c41a" : "#ff4d4f",
                fontWeight: "bold",
              }}
            >
              {selectedUser?.is_active === "ACTIVE" ? "Hoạt động" : "Bị khóa"}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};


export default UsersSection;

