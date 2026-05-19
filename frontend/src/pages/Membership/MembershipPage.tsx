import React, { useEffect, useState } from "react";
import {
  Award,
  ChevronRight,
  Crown,
  Gift,
  History,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { getMyMembership, getAllTiers, getTierHistory } from "../../services/membershipService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import type {
  ApiMembershipInfo,
  ApiMembershipTier,
  ApiTierHistory,
} from "../../types/api";

const tierIcons: Record<string, React.ReactNode> = {
  "Thành viên": <Star size={22} />,
  Silver: <Award size={22} />,
  Gold: <Crown size={22} />,
  Platinum: <Sparkles size={22} />,
};

const benefitIcons: Record<string, React.ReactNode> = {
  DISCOUNT_TICKET: <Zap size={18} />,
  FREE_POPCORN: <Gift size={18} />,
  FREE_COMBO: <Gift size={18} />,
  PRIORITY_BOOKING: <TrendingUp size={18} />,
  FREE_UPGRADE_SEAT: <ChevronRight size={18} />,
  BIRTHDAY_GIFT: <Gift size={18} />,
  LOUNGE_ACCESS: <Crown size={18} />,
};

const MembershipPage = () => {
  const [membership, setMembership] = useState<ApiMembershipInfo | null>(null);
  const [tiers, setTiers] = useState<ApiMembershipTier[]>([]);
  const [history, setHistory] = useState<ApiTierHistory[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "tiers" | "history">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membershipData, tiersData, historyData] = await Promise.all([
          getMyMembership(),
          getAllTiers(),
          getTierHistory(),
        ]);
        setMembership(membershipData);
        setTiers(tiersData);
        setHistory(historyData);
      } catch (err: any) {
        setError(err.response?.data?.message || "Bạn cần đăng nhập để xem thông tin membership.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="app-page">
        <div className="container">
          <div className="section-state">Đang tải thông tin membership...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="app-page">
        <div className="container">
          <div className="section-state warning">{error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="app-page">
      <div className="container">
        {/* Hero */}
        <div className="membership-hero">
          <div>
            <p className="eyebrow">VIP Membership</p>
            <h1>Chương trình thành viên</h1>
            <p className="muted">
              Tích lũy chi tiêu, nâng hạng và nhận ưu đãi độc quyền tại CINEMAX.
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="membership-tabs">
          <button
            className={`membership-tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
            type="button"
          >
            <Star size={18} />
            Tổng quan
          </button>
          <button
            className={`membership-tab ${activeTab === "tiers" ? "active" : ""}`}
            onClick={() => setActiveTab("tiers")}
            type="button"
          >
            <Crown size={18} />
            Hạng thành viên
          </button>
          <button
            className={`membership-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
            type="button"
          >
            <History size={18} />
            Lịch sử
          </button>
        </div>

        {/* Tab: Overview */}
        {activeTab === "overview" && membership && (
          <div className="membership-overview">
            {/* Current tier card */}
            <div
              className="membership-tier-card"
              style={{ "--tier-color": membership.tier.color_hex } as React.CSSProperties}
            >
              <div className="tier-card-glow" />
              <div className="tier-card-content">
                <div className="tier-card-top">
                  <div className="tier-badge">
                    {tierIcons[membership.tier.name] || <Star size={22} />}
                    <span>{membership.tier.name}</span>
                  </div>
                  <span className="tier-discount">
                    {membership.tier.discount_percent > 0
                      ? `-${membership.tier.discount_percent}% vé`
                      : "Hạng cơ bản"}
                  </span>
                </div>

                <div className="tier-card-stats">
                  <div>
                    <span className="stat-value">{formatCurrency(membership.total_spend)}</span>
                    <small>Tổng chi tiêu</small>
                  </div>
                  <div>
                    <span className="stat-value">{membership.points_available}</span>
                    <small>Điểm khả dụng</small>
                  </div>
                  <div>
                    <span className="stat-value">x{membership.tier.point_multiplier}</span>
                    <small>Hệ số điểm</small>
                  </div>
                </div>

                {/* Progress to next tier */}
                {membership.next_tier && (
                  <div className="tier-progress">
                    <div className="tier-progress-header">
                      <span>Tiến độ lên {membership.next_tier.name}</span>
                      <span>{membership.next_tier.progress_percent}%</span>
                    </div>
                    <div className="tier-progress-bar">
                      <div
                        className="tier-progress-fill"
                        style={{ width: `${membership.next_tier.progress_percent}%` }}
                      />
                    </div>
                    <p className="tier-progress-hint">
                      Cần thêm {formatCurrency(membership.next_tier.spend_remaining)} để lên{" "}
                      <strong>{membership.next_tier.name}</strong>
                    </p>
                  </div>
                )}

                {!membership.next_tier && (
                  <p className="tier-max-note">
                    <Sparkles size={16} />
                    Bạn đang ở hạng cao nhất — Platinum!
                  </p>
                )}
              </div>
            </div>

            {/* Benefits */}
            <div className="membership-benefits-card">
              <div className="benefits-card-title">
                <Gift size={22} />
                <h2>Ưu đãi hiện tại</h2>
              </div>
              {membership.benefits.length === 0 ? (
                <p className="muted">Hạng Thành viên chưa có ưu đãi đặc biệt. Hãy chi tiêu thêm để nâng hạng!</p>
              ) : (
                <div className="benefits-grid">
                  {membership.benefits.map((benefit) => (
                    <div className="benefit-item" key={benefit.id}>
                      <div className="benefit-icon">
                        {benefitIcons[benefit.benefit_key] || <Gift size={18} />}
                      </div>
                      <div className="benefit-info">
                        <strong>{benefit.label}</strong>
                        {benefit.value && <small>{benefit.value}</small>}
                      </div>
                      {benefit.used_this_month !== undefined && benefit.used_this_month > 0 && (
                        <span className="benefit-used">
                          Đã dùng {benefit.used_this_month} lần
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Points info */}
            <div className="membership-points-card">
              <h3>Điểm thưởng</h3>
              <div className="points-grid">
                <div>
                  <span className="points-number">{membership.points}</span>
                  <small>Tổng tích lũy</small>
                </div>
                <div>
                  <span className="points-number">{membership.points_used}</span>
                  <small>Đã sử dụng</small>
                </div>
                <div>
                  <span className="points-number highlight">{membership.points_available}</span>
                  <small>Khả dụng</small>
                </div>
              </div>
              <p className="muted points-note">
                1 điểm = 1.000đ khi thanh toán · 10.000đ chi tiêu = 1 điểm (×{membership.tier.point_multiplier} hệ số)
              </p>
            </div>
          </div>
        )}

        {/* Tab: All Tiers */}
        {activeTab === "tiers" && (
          <div className="membership-tiers-grid">
            {tiers.map((tier) => {
              const isCurrent = membership?.tier.id === tier.id;
              return (
                <div
                  className={`tier-info-card ${isCurrent ? "current" : ""}`}
                  key={tier.id}
                  style={{ "--tier-color": tier.color_hex } as React.CSSProperties}
                >
                  {isCurrent && <span className="tier-current-badge">Hạng của bạn</span>}
                  <div className="tier-info-header">
                    <div className="tier-info-icon">
                      {tierIcons[tier.name] || <Star size={28} />}
                    </div>
                    <h2>{tier.name}</h2>
                    <p className="tier-info-spend">
                      {tier.min_spend === 0
                        ? "Miễn phí"
                        : `Từ ${formatCurrency(tier.min_spend)}`}
                    </p>
                  </div>

                  <div className="tier-info-highlights">
                    <div>
                      <strong>{tier.discount_percent}%</strong>
                      <small>Giảm giá vé</small>
                    </div>
                    <div>
                      <strong>x{tier.point_multiplier}</strong>
                      <small>Hệ số điểm</small>
                    </div>
                  </div>

                  <ul className="tier-info-benefits">
                    {tier.benefits.length === 0 && (
                      <li className="no-benefit">Chưa có ưu đãi đặc biệt</li>
                    )}
                    {tier.benefits.map((b) => (
                      <li key={b.id}>
                        {benefitIcons[b.benefit_key] || <ChevronRight size={16} />}
                        <span>
                          {b.label}
                          {b.value && <small> — {b.value}</small>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: History */}
        {activeTab === "history" && (
          <div className="membership-history">
            {history.length === 0 ? (
              <div className="section-state">Chưa có lịch sử thay đổi hạng.</div>
            ) : (
              <div className="history-timeline">
                {history.map((entry) => (
                  <div className="history-item" key={entry.id}>
                    <div
                      className={`history-icon ${entry.reason.toLowerCase()}`}
                      style={{ "--tier-color": entry.new_color } as React.CSSProperties}
                    >
                      {entry.reason === "UPGRADE" ? (
                        <TrendingUp size={18} />
                      ) : entry.reason === "INIT" ? (
                        <Star size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </div>
                    <div className="history-content">
                      <div className="history-title">
                        {entry.reason === "INIT" && (
                          <span>
                            Khởi tạo thành viên → <strong style={{ color: entry.new_color }}>{entry.new_tier_name}</strong>
                          </span>
                        )}
                        {entry.reason === "UPGRADE" && (
                          <span>
                            Nâng hạng{" "}
                            <strong style={{ color: entry.old_color || undefined }}>{entry.old_tier_name}</strong>
                            {" → "}
                            <strong style={{ color: entry.new_color }}>{entry.new_tier_name}</strong>
                          </span>
                        )}
                        {entry.reason === "DOWNGRADE" && (
                          <span>
                            Hạ hạng{" "}
                            <strong style={{ color: entry.old_color || undefined }}>{entry.old_tier_name}</strong>
                            {" → "}
                            <strong style={{ color: entry.new_color }}>{entry.new_tier_name}</strong>
                          </span>
                        )}
                      </div>
                      <div className="history-meta">
                        <span>{formatDateTime(entry.changed_at)}</span>
                        <span>Chi tiêu: {formatCurrency(entry.total_spend_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default MembershipPage;
