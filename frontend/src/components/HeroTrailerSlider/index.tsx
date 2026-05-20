import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Autoplay, EffectFade, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper/types";
import { getMovieTrailers, type TrailerSlide } from "../../services/movieService";
import styles from "./HeroTrailerSlider.module.scss";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: (event: { target: YoutubePlayer }) => void;
            onError?: () => void;
          };
        }
      ) => YoutubePlayer;
      PlayerState: {
        PLAYING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YoutubePlayer {
  destroy: () => void;
  mute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
}

type MaybeYoutubePlayer = Partial<YoutubePlayer> | null | undefined;

const YOUTUBE_API_SRC = "https://www.youtube.com/iframe_api";
const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80";

let youtubeApiPromise: Promise<void> | null = null;

const loadYoutubeApi = (): Promise<void> => {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<void>((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${YOUTUBE_API_SRC}"]`);
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = YOUTUBE_API_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };
  });

  return youtubeApiPromise;
};

const extractYoutubeVideoId = (trailerUrl: string): string | null => {
  const cleaned = trailerUrl.trim();
  if (!cleaned) {
    return null;
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
    return cleaned;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const matched = cleaned.match(pattern);
    if (matched?.[1]) {
      return matched[1];
    }
  }

  return null;
};

const getDisplayPosterUrl = (url: string | null): string => {
  if (!url) {
    return FALLBACK_POSTER;
  }

  // Upgrade TMDB poster resolution to reduce blur on fullscreen hero.
  if (url.includes("image.tmdb.org/t/p/w500/")) {
    return url.replace("/w500/", "/w1280/");
  }

  return url;
};

const safelyPausePlayer = (player: MaybeYoutubePlayer) => {
  if (typeof player?.pauseVideo !== "function") {
    return;
  }
  try {
    player.pauseVideo();
  } catch (_error) {
    // Ignore player lifecycle race in dev/hot reload.
  }
};

const safelyPlayPlayer = (player: MaybeYoutubePlayer) => {
  if (typeof player?.playVideo !== "function") {
    return;
  }
  try {
    player.playVideo();
  } catch (_error) {
    // Ignore player lifecycle race in dev/hot reload.
  }
};

const safelyMutePlayer = (player: MaybeYoutubePlayer) => {
  if (typeof player?.mute !== "function") {
    return;
  }
  try {
    player.mute();
  } catch (_error) {
    // Ignore player lifecycle race in dev/hot reload.
  }
};

const safelyDestroyPlayer = (player: MaybeYoutubePlayer) => {
  if (typeof player?.destroy !== "function") {
    return;
  }
  try {
    player.destroy();
  } catch (_error) {
    // React StrictMode can unmount nodes twice in development.
  }
};

const HeroTrailerSlider = () => {
  const [slides, setSlides] = useState<TrailerSlide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [modalVideoId, setModalVideoId] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [failedSlides, setFailedSlides] = useState<Record<number, boolean>>({});

  const swiperRef = useRef<SwiperType | null>(null);
  const playersRef = useRef<Record<number, YoutubePlayer>>({});
  const containersRef = useRef<Record<number, HTMLDivElement | null>>({});
  const playerMountNodesRef = useRef<Record<number, HTMLDivElement | null>>({});
  const creatingPlayersRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const updateIsMobile = () => setIsMobile(media.matches);
    updateIsMobile();
    media.addEventListener("change", updateIsMobile);
    return () => media.removeEventListener("change", updateIsMobile);
  }, []);

  useEffect(() => {
    const fetchTrailers = async () => {
      try {
        const data = await getMovieTrailers();
        setSlides(data);
      } catch (_error) {
        setSlides([]);
      }
    };

    fetchTrailers();
  }, []);

  const slidesWithMeta = useMemo(
    () =>
      slides.map((slide) => ({
        ...slide,
        videoId: extractYoutubeVideoId(slide.trailer_url),
      })),
    [slides]
  );
  const trailerSlides = useMemo(() => slidesWithMeta.filter((slide) => !!slide.videoId), [slidesWithMeta]);

  useEffect(() => {
    if (activeIndex < trailerSlides.length) {
      return;
    }
    setActiveIndex(0);
  }, [activeIndex, trailerSlides.length]);

  useEffect(() => {
    if (isMobile || modalVideoId || trailerSlides.length === 0) {
      return;
    }

    const ensurePlayerForIndex = async (index: number) => {
      const slide = trailerSlides[index];
      if (!slide || !slide.videoId || failedSlides[slide.id]) {
        return;
      }

      if (playersRef.current[slide.id]) {
        return;
      }
      if (creatingPlayersRef.current[slide.id]) {
        return;
      }

      const container = containersRef.current[slide.id];
      if (!container || !container.isConnected) {
        return;
      }

      let mountNode = playerMountNodesRef.current[slide.id];
      if (!mountNode || !mountNode.isConnected || mountNode.parentElement !== container) {
        container.innerHTML = "";
        mountNode = document.createElement("div");
        mountNode.id = `hero-trailer-mount-${slide.id}`;
        mountNode.style.width = "100%";
        mountNode.style.height = "100%";
        container.appendChild(mountNode);
        playerMountNodesRef.current[slide.id] = mountNode;
      }

      creatingPlayersRef.current[slide.id] = true;
      await loadYoutubeApi();
      if (!window.YT?.Player) {
        setFailedSlides((prev) => ({ ...prev, [slide.id]: true }));
        creatingPlayersRef.current[slide.id] = false;
        return;
      }
      if (!container.isConnected || containersRef.current[slide.id] !== container) {
        creatingPlayersRef.current[slide.id] = false;
        return;
      }

      playersRef.current[slide.id] = new window.YT.Player(mountNode.id, {
        videoId: slide.videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          loop: 1,
          modestbranding: 1,
          mute: 1,
          playsinline: 1,
          rel: 0,
          playlist: slide.videoId ? 1 : 0,
        },
        events: {
          onReady: (event) => {
            safelyMutePlayer(event.target);
            if (index === activeIndex) {
              safelyPlayPlayer(event.target);
            } else {
              safelyPausePlayer(event.target);
            }
          },
          onError: () => {
            setFailedSlides((prev) => ({ ...prev, [slide.id]: true }));
          },
        },
      });
      creatingPlayersRef.current[slide.id] = false;
    };

    const nextIndex = (activeIndex + 1) % trailerSlides.length;
    void ensurePlayerForIndex(activeIndex);
    if (nextIndex !== activeIndex) {
      void ensurePlayerForIndex(nextIndex);
    }
  }, [activeIndex, trailerSlides, isMobile, modalVideoId, failedSlides]);

  useEffect(() => {
    if (isMobile || trailerSlides.length === 0) {
      return;
    }

    trailerSlides.forEach((slide, index) => {
      const player = playersRef.current[slide.id];
      if (!player) {
        return;
      }
      if (index === activeIndex && !modalVideoId) {
        safelyPlayPlayer(player);
      } else {
        safelyPausePlayer(player);
      }
    });
  }, [activeIndex, isMobile, trailerSlides, modalVideoId]);

  useEffect(() => {
    return () => {
      Object.values(playersRef.current).forEach(safelyDestroyPlayer);
      playersRef.current = {};
      Object.values(containersRef.current).forEach((container) => {
        if (container) {
          container.innerHTML = "";
        }
      });
      playerMountNodesRef.current = {};
      creatingPlayersRef.current = {};
    };
  }, []);

  const activeSlide = trailerSlides[activeIndex];

  if (!activeSlide) {
    return (
      <section className={styles.hero}>
        <img className={styles.posterFallback} src={FALLBACK_POSTER} alt="Cinema hero" />
      </section>
    );
  }

  const openTrailerModal = () => {
    if (!activeSlide.videoId) {
      return;
    }

    Object.values(playersRef.current).forEach((player) => safelyPausePlayer(player));
    setModalVideoId(activeSlide.videoId);
  };

  const closeTrailerModal = () => {
    setModalVideoId(null);
    const current = trailerSlides[activeIndex];
    if (!current) {
      return;
    }
    const currentPlayer = playersRef.current[current.id];
    safelyPlayPlayer(currentPlayer);
  };

  return (
    <section className={styles.hero}>
      <Swiper
        modules={[Autoplay, EffectFade, Pagination]}
        slidesPerView={1}
        loop
        effect="fade"
        speed={900}
        onSwiper={(swiper: SwiperType) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={(swiper: SwiperType) => {
          setActiveIndex(swiper.realIndex);
        }}
        autoplay={{
          delay: 8000,
          disableOnInteraction: false,
          pauseOnMouseEnter: false,
        }}
        className={styles.swiper}
      >
        {trailerSlides.map((slide) => {
          const shouldRenderVideo = !isMobile && !!slide.videoId && !failedSlides[slide.id];
          const poster = getDisplayPosterUrl(slide.poster_url);

          return (
            <SwiperSlide key={slide.id}>
              <div className={styles.slide}>
                {shouldRenderVideo ? (
                  <div
                    id={`hero-trailer-${slide.id}`}
                    ref={(node) => {
                      containersRef.current[slide.id] = node;
                    }}
                    className={styles.videoLayer}
                  />
                ) : (
                  <img className={styles.posterFallback} src={poster} alt={slide.title} />
                )}
                <div className={styles.overlay} />
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      <div className={styles.content}>
        <span className={styles.genreBadge}>{activeSlide.genre || "Cinema"}</span>
        <h1>{activeSlide.title}</h1>
        <div className={styles.actions}>
          <a className="primary-btn" href="#movies">
            Đặt vé ngay
          </a>
          <button className={styles.trailerBtn} onClick={openTrailerModal} disabled={!activeSlide.videoId}>
            <Play size={16} /> Trailer
          </button>
        </div>
      </div>

      <button
        className={`${styles.arrowBtn} ${styles.arrowLeft}`}
        onClick={() => swiperRef.current?.slidePrev()}
        aria-label="Slide trước"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        className={`${styles.arrowBtn} ${styles.arrowRight}`}
        onClick={() => swiperRef.current?.slideNext()}
        aria-label="Slide tiếp theo"
      >
        <ChevronRight size={22} />
      </button>

      <div className={styles.indicators}>
        {trailerSlides.map((slide, index) => {
          const isActive = index === activeIndex;
          const isPreview = hoverIndex === index;
          return (
            <button
              key={slide.id}
              className={`${styles.indicator} ${isActive ? styles.active : ""}`}
              onClick={() => swiperRef.current?.slideToLoop(index)}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              aria-label={`Chuyển đến ${slide.title}`}
            >
              <span className={styles.dot} />
              {isPreview && (
                <img
                  className={styles.preview}
                  src={getDisplayPosterUrl(slide.poster_url)}
                  alt={`${slide.title} preview`}
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {modalVideoId && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeTrailerModal}
          >
            <motion.div
              className={styles.modalBody}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button className={styles.closeBtn} onClick={closeTrailerModal} aria-label="Đóng trailer">
                x
              </button>
              <iframe
                title="Movie trailer"
                src={`https://www.youtube.com/embed/${modalVideoId}?autoplay=1&mute=0&rel=0&playsinline=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default HeroTrailerSlider;
