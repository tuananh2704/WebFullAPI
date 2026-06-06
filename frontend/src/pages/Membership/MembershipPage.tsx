import React, { useEffect, useState } from "react";
import {
  Award,
  ChevronRight,
  Copy,
  Crown,
  Gift,
  History,
  X,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  exchangeVoucher,
  getBenefitUsage,
  getMyMembership,
  getAllTiers,
  getTierHistory,
  getMyVouchers,
} from "../../services/membershipService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import type {
  ApiMembershipInfo,
  ApiMembershipTier,
  ApiBenefitUsage,
  ApiTierHistory,
  ApiUserVoucher,
} from "../../types/api";

const voucherOptions = [
  { discount: 50000, points: 50 },
  { discount: 100000, points: 100 },
  { discount: 200000, points: 200 },
];

const voucherPageSize = 5;

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

const benefitLabels: Record<string, string> = {
  FREE_POPCORN: "Bỏng ngô miễn phí",
  FREE_COMBO: "Combo miễn phí",
  FREE_UPGRADE_SEAT: "Nâng hạng ghế miễn phí",
  BIRTHDAY_GIFT: "Quà sinh nhật",
  LOUNGE_ACCESS: "Lounge VIP",
};

const voucherStatusLabels: Record<ApiUserVoucher["status"], string> = {
  AVAILABLE: "Chưa sử dụng",
  RESERVED: "Đang chờ duyệt",
  USED: "Đã sử dụng",
};

const MembershipPage = () => {
  const [membership, setMembership] = useState<ApiMembershipInfo | null>(null);
  const [tiers, setTiers] = useState<ApiMembershipTier[]>([]);
  const [history, setHistory] = useState<ApiTierHistory[]>([]);
  const [benefitUsage, setBenefitUsage] = useState<ApiBenefitUsage[]>([]);
  const [vouchers, setVouchers] = useState<ApiUserVoucher[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "tiers" | "history">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [voucherLoading, setVoucherLoading] = useState<number | null>(null);
  const [voucherPage, setVoucherPage] = useState(1);
  const [exchangeRequest, setExchangeRequest] = useState<{ discount: number; points: number } | null>(null);
  const [freePopcornPending, setFreePopcornPending] = useState(
    () => localStorage.getItem("cinemax_use_free_popcorn") === "1"
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membershipData, tiersData, historyData, usageData, voucherData] = await Promise.all([
          getMyMembership(),
          getAllTiers(),
          getTierHistory(),
          getBenefitUsage(),
          getMyVouchers(),
        ]);
        setMembership(membershipData);
        setTiers(tiersData);
        setHistory(historyData);
        setBenefitUsage(usageData);
        setVouchers(voucherData);
      } catch (err: any) {
        setError(err.response?.data?.message || "Bạn cần đăng nhập để xem thông tin membership.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const interval = window.setInterval(fetchData, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const refreshMembershipAndVouchers = async () => {
    const [membershipData, voucherData] = await Promise.all([getMyMembership(), getMyVouchers()]);
    setMembership(membershipData);
    setVouchers(voucherData);
  };

  const availableVouchers = vouchers.filter((voucher) => {
    if (voucher.status !== "AVAILABLE") return false;
    if (!voucher.expires_at) return true;
    return new Date(voucher.expires_at).getTime() >= Date.now();
  });
  const voucherTotalPages = Math.max(1, Math.ceil(availableVouchers.length / voucherPageSize));
  const currentVoucherPage = Math.min(voucherPage, voucherTotalPages);
  const visibleVouchers = availableVouchers.slice(
    (currentVoucherPage - 1) * voucherPageSize,
    currentVoucherPage * voucherPageSize
  );

  const handleExchangeVoucher = async (discountAmount: number) => {
    const option = voucherOptions.find((item) => item.discount === discountAmount);
    if (!option) return;

    setExchangeRequest({ discount: discountAmount, points: option.points });
  };

  const confirmExchangeVoucher = async () => {
    if (!exchangeRequest) return;

    setVoucherLoading(exchangeRequest.discount);
    setVoucherMessage("");
    try {
      const voucher = await exchangeVoucher(exchangeRequest.discount);
      await refreshMembershipAndVouchers();
      setVoucherPage(1);
      setExchangeRequest(null);
      setVoucherMessage(`Đã đổi voucher ${voucher.code}.`);
    } catch (err: any) {
      setVoucherMessage(err.response?.data?.message || "Không đổi được voucher.");
    } finally {
      setVoucherLoading(null);
    }
  };

  const handleCopyVoucher = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setVoucherMessage(`Đã sao chép mã ${code}.`);
    } catch {
      setVoucherMessage(`Mã voucher: ${code}`);
    }
  };

  const handleUseFreePopcorn = () => {
    localStorage.setItem("cinemax_use_free_popcorn", "1");
    setFreePopcornPending(true);
  };

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
                      {benefit.benefit_key === "FREE_POPCORN" && (
                        <button
                          className={`benefit-use-btn ${
                            benefit.used_this_month && benefit.used_this_month > 0
                              ? "used"
                              : freePopcornPending
                              ? "pending"
                              : ""
                          }`}
                          type="button"
                          onClick={handleUseFreePopcorn}
                          disabled={freePopcornPending || (benefit.used_this_month || 0) > 0}
                        >
                          {benefit.used_this_month && benefit.used_this_month > 0
                            ? "Đã sử dụng"
                            : freePopcornPending
                            ? "Đang chờ sử dụng"
                            : "Sử dụng"}
                        </button>
                      )}
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

        {activeTab === "overview" && membership && (
          <div className="membership-voucher-section">
            <div className="voucher-exchange-header">
              <h4>Quy đổi voucher</h4>
              <small>1 điểm = 1.000đ</small>
            </div>
            <div className="voucher-option-grid">
              {voucherOptions.map((option) => {
                const canExchange = membership.points_available >= option.points;
                return (
                  <button
                    className="voucher-option"
                    key={option.discount}
                    type="button"
                    disabled={!canExchange || voucherLoading !== null}
                    onClick={() => handleExchangeVoucher(option.discount)}
                  >
                    <strong>{formatCurrency(option.discount)}</strong>
                    <small>{option.points} điểm</small>
                  </button>
                );
              })}
            </div>
            {availableVouchers.length > 0 && (
              <div className="voucher-list">
                {visibleVouchers.map((voucher) => (
                  <div className="voucher-code-row" key={voucher.id}>
                    <div>
                      <strong>{voucher.code}</strong>
                      <small>
                        Giảm {formatCurrency(voucher.discount_amount)} · {voucherStatusLabels[voucher.status]}
                      </small>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyVoucher(voucher.code)}
                    >
                      <Copy size={15} />
                      Copy
                    </button>
                  </div>
                ))}
                {voucherTotalPages > 1 && (
                  <div className="voucher-pagination">
                    <button
                      type="button"
                      disabled={currentVoucherPage === 1}
                      onClick={() => setVoucherPage((page) => Math.max(1, page - 1))}
                    >
                      Trước
                    </button>
                    <span>
                      Trang {currentVoucherPage}/{voucherTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentVoucherPage === voucherTotalPages}
                      onClick={() => setVoucherPage((page) => Math.min(voucherTotalPages, page + 1))}
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            )}
            {voucherMessage && <p className="voucher-message">{voucherMessage}</p>}
          </div>
        )}

        {exchangeRequest && (
          <div
            className="cinemax-dialog-backdrop"
            role="presentation"
            onMouseDown={() => {
              if (voucherLoading === null) setExchangeRequest(null);
            }}
          >
            <div
              className="cinemax-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="voucher-exchange-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                className="cinemax-dialog-close"
                type="button"
                aria-label="Đóng"
                onClick={() => setExchangeRequest(null)}
                disabled={voucherLoading !== null}
              >
                <X size={18} />
              </button>
              <div className="cinemax-dialog-icon">
                <Gift size={24} />
              </div>
              <h3 id="voucher-exchange-title">Đổi voucher VIP</h3>
              <p>
                Dùng <strong>{exchangeRequest.points} điểm</strong> để nhận voucher giảm{" "}
                <strong>{formatCurrency(exchangeRequest.discount)}</strong>.
              </p>
              <div className="cinemax-dialog-actions">
                <button
                  className="cinemax-dialog-secondary"
                  type="button"
                  onClick={() => setExchangeRequest(null)}
                  disabled={voucherLoading !== null}
                >
                  Hủy
                </button>
                <button
                  className="cinemax-dialog-primary"
                  type="button"
                  onClick={confirmExchangeVoucher}
                  disabled={voucherLoading !== null}
                >
                  {voucherLoading !== null ? "Đang đổi..." : "Xác nhận đổi"}
                </button>
              </div>
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
            {benefitUsage.length > 0 && (
              <div className="benefit-history-panel">
                <h3>Lịch sử ưu đãi</h3>
                {benefitUsage.map((item) => (
                  <div className="benefit-history-row" key={item.id}>
                    <span>{benefitLabels[item.benefit_key] || item.benefit_key}</span>
                    <small>
                      {formatDateTime(item.used_at)}
                      {item.booking_code ? ` · ${item.booking_code}` : ""}
                    </small>
                  </div>
                ))}
              </div>
            )}
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
