import { ChevronDown } from "lucide-react";

// Video nền cinematic từ Pexels – phong cách rạp chiếu phim
const CINEMA_VIDEO =
  "https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_25fps.mp4";

const HeroSection = () => {
  return (
    <section className="hero">
      {/* Video nền – fullscreen, không có text đè lên */}
      <video
        className="hero-video-bg"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={CINEMA_VIDEO} type="video/mp4" />
      </video>

      {/* Overlay gradient mờ dần ở dưới */}
      <div className="hero-video-overlay" />

      {/* Logo / branding nhỏ góc trái (tuỳ chọn, không lấn át) */}
      <div className="hero-badge">
        <span className="hero-badge-pill">🎬 Đang chiếu</span>
      </div>

      {/* Chỉ có nút scroll-down ở giữa dưới cùng */}
      <a className="hero-scroll-hint" href="#movies" aria-label="Cuộn xuống xem phim">
        <ChevronDown size={32} />
      </a>
    </section>
  );
};

export default HeroSection;
