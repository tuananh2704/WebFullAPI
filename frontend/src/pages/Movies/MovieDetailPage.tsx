import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { Steps, Select, Tag, Spin, Empty, Modal, Result } from "antd";
import { createBooking, getBookingDetail } from "../../services/bookingService";
import { getFoodSizes, getFoods } from "../../services/foodService";
import {
  createMovieRating,
  getCanRateMovie,
  getMovieById,
  getMovieRatings,
} from "../../services/movieService";
import { createPayment } from "../../services/paymentService";
import { applyPromotion } from "../../services/promotionService";
import { getSeatsByShowtime } from "../../services/seatService";
import { getCinemas, getShowtimesByMovieAndCinema } from "../../services/cinemaService";
import { getShowtimesByMovie } from "../../services/showtimeService";
import { getCurrentUser, isLoggedIn } from "../../services/authService";
import { getMyMembership } from "../../services/membershipService";
import type {
  ApiCinema,
  ApiFood,
  ApiFoodSize,
  ApiMembershipInfo,
  ApiMovie,
  ApiMovieRating,
  ApiCanRateMovie,
  ApiSeat,
  ApiShowtime,
  ShowtimeByDate,
} from "../../types/api";
import { formatCurrency, formatDateTime } from "../../utils/format";

type SelectedFoodItem = {
  sizeId: number;
  food_id: number;
  food_name: string;
  size_name: string;
  price: number;
  quantity: number;
};

const COMBO_NAME_PATTERN = /^combo(?:\s*\d+|\s+family)$/i;
const COMBO_IMAGE_COUNT = 4;

const ROOM_TYPE_COLOR: Record<string, string> = {
  "2D": "#37474F",
  "3D": "#1565C0",
  IMAX: "#4A148C",
  "4DX": "#BF360C",
};

const SEAT_TYPE_COLOR: Record<string, string> = {
  NORMAL: "#4CAF50",
  VIP: "#FF9800",
  COUPLE: "#E91E63",
};

const formatLocalDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getTodayDateKey = () => formatLocalDate(new Date());

const getShowDate = (showtime: ApiShowtime) => {
  if (showtime.show_date) {
    return showtime.show_date.slice(0, 10);
  }

  return formatLocalDate(new Date(showtime.start_time));
};

const isTuesdayDateKey = (dateKey: string) => {
  return new Date(`${dateKey}T00:00:00`).getDay() === 2;
};

const getMinimumAge = (ageRating?: string | null) => {
  const normalized = String(ageRating || "P").toUpperCase();
  if (normalized === "P" || normalized === "K") return 0;
  const match = normalized.match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const calculateAge = (birthDate?: string | null) => {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
};

const getComboNumber = (name: string) => {
  const match = name.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

const getFoodImage = (food?: ApiFood) => {
  const imageUrl = food?.image_url?.trim();
  const foodName = food?.name || "";

  if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  if (imageUrl?.startsWith("/")) {
    return imageUrl;
  }

  if (/^combo\s+family$/i.test(foodName.trim())) {
    return "/images/foods/combo-family.svg";
  }

  const comboNumber = getComboNumber(foodName);
  const imageIndex = Number.isFinite(comboNumber)
    ? ((comboNumber - 1) % COMBO_IMAGE_COUNT) + 1
    : 1;

  return `/images/foods/combo-${imageIndex}.svg`;
};

const getSizeOrder = (sizeName: string) => {
  const order: Record<string, number> = { S: 1, M: 2, L: 3 };
  return order[sizeName] || 99;
};

const generateNext30Days = (): string[] => {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(formatLocalDate(d));
  }
  return days;
};

const formatTabLabel = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const isToday = dateStr === formatLocalDate(new Date());
  return (
    <span className="date-tab-label">
      <span className="date-tab-day">{isToday ? "Hôm nay" : dayNames[d.getDay()]}</span>
      <span className="date-tab-date">{dd}/{mm}</span>
    </span>
  );
};

const MovieDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const movieId = Number(id);
  const preselectedCinemaId = Number(searchParams.get("cinema_id"));
  const preselectedDate = searchParams.get("date");
  const showBookingFlow =
    searchParams.get("booking") === "1" ||
    searchParams.has("showtime_id") ||
    searchParams.has("cinema_id") ||
    searchParams.has("date");

  const [movie, setMovie] = useState<ApiMovie | null>(null);
  const [cinemas, setCinemas] = useState<ApiCinema[]>([]);
  const [movieShowtimes, setMovieShowtimes] = useState<ApiShowtime[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(
    Number.isFinite(preselectedCinemaId) && preselectedCinemaId > 0 ? preselectedCinemaId : null
  );
  const [showtimesByDate, setShowtimesByDate] = useState<ShowtimeByDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = getTodayDateKey();
    return preselectedDate && preselectedDate >= today ? preselectedDate : today;
  });
  const [selectedShowtime, setSelectedShowtime] = useState<ApiShowtime | null>(null);
  const [seats, setSeats] = useState<ApiSeat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [foods, setFoods] = useState<ApiFood[]>([]);
  const [foodSizes, setFoodSizes] = useState<ApiFoodSize[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<SelectedFoodItem[]>([]);
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotionCode, setAppliedPromotionCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [membershipInfo, setMembershipInfo] = useState<ApiMembershipInfo | null>(null);
  const [useFreePopcorn, setUseFreePopcorn] = useState(
    () => localStorage.getItem("cinemax_use_free_popcorn") === "1"
  );
  const [message, setMessage] = useState("");
  const [ratingReviews, setRatingReviews] = useState<ApiMovieRating[]>([]);
  const [canRateMovie, setCanRateMovie] = useState<ApiCanRateMovie | null>(null);
  const [ratingValue, setRatingValue] = useState(10);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Ticket state — after successful booking + payment
  const [ticketData, setTicketData] = useState<any>(null);
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transferContent, setTransferContent] = useState("");

  const loggedIn = isLoggedIn();
  const currentUser = getCurrentUser();
  const minimumAge = getMinimumAge(movie?.age_rating);
  const currentUserAge = calculateAge(currentUser?.birth_date);
  const ageRestricted =
    minimumAge > 0 && loggedIn && currentUserAge !== null && currentUserAge < minimumAge;

  // Determine current booking step
  const currentStep = ticketData
    ? 4
    : !selectedCinemaId
    ? 0
    : !selectedShowtime
    ? 1
    : !selectedSeats.length
    ? 2
    : 3;

  const next30Days = useMemo(() => generateNext30Days(), []);

  const loadRatingState = async () => {
    const ratings = await getMovieRatings(movieId);
    setRatingReviews(ratings.reviews || []);
    setMovie((current) =>
      current
        ? {
            ...current,
            rating: ratings.average_rating,
            total_ratings: ratings.total_ratings,
          }
        : current
    );

    if (isLoggedIn()) {
      const permission = await getCanRateMovie(movieId);
      setCanRateMovie(permission);
    } else {
      setCanRateMovie({
        canRate: false,
        reason: "Bạn có thể đánh giá sau khi xem phim.",
      });
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [movieData, cinemaData, movieShowtimeData, foodData, sizeData, ratingsData] = await Promise.all([
          getMovieById(movieId),
          getCinemas(),
          getShowtimesByMovie(movieId),
          getFoods(),
          getFoodSizes(),
          getMovieRatings(movieId),
        ]);
        setMovie({
          ...movieData,
          rating: ratingsData.average_rating || movieData.rating,
          total_ratings: ratingsData.total_ratings ?? movieData.total_ratings,
        });
        setRatingReviews(ratingsData.reviews || []);
        setCinemas(cinemaData);
        const today = getTodayDateKey();
        setMovieShowtimes(
          movieShowtimeData.filter(
            (showtime) => showtime.status !== "CANCELLED" && getShowDate(showtime) >= today
          )
        );
        setFoods(foodData);
        setFoodSizes(sizeData);
      } catch (error: any) {
        setMessage(error.response?.data?.message || "Không tải được chi tiết phim.");
      } finally {
        setLoadingPage(false);
      }
    };
    load();

    // Fetch membership info for logged-in users
    if (isLoggedIn()) {
      getMyMembership()
        .then(setMembershipInfo)
        .catch(() => {});
      getCanRateMovie(movieId)
        .then(setCanRateMovie)
        .catch(() => {
          setCanRateMovie({
            canRate: false,
            reason: "Bạn có thể đánh giá sau khi xem phim.",
          });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId]);

  // Pre-select showtime from URL param ?showtime_id=X
  const preselectedShowtimeId = searchParams.get("showtime_id");
  useEffect(() => {
    if (preselectedShowtimeId && showtimesByDate.length > 0) {
      for (const group of showtimesByDate) {
        const st = group.showtimes.find((s) => String(s.id) === preselectedShowtimeId);
        if (st) {
          handleChooseShowtime(st);
          break;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedShowtimeId, showtimesByDate]);

  useEffect(() => {
    if (!selectedCinemaId) {
      setShowtimesByDate([]);
      setSelectedShowtime(null);
      return;
    }
    const load = async () => {
      setLoadingShowtimes(true);
      try {
        const data = await getShowtimesByMovieAndCinema(movieId, selectedCinemaId, {
          date: selectedDate,
        });
        setShowtimesByDate(data);
        setSelectedShowtime(null);
        setSelectedSeats([]);
        setSeats([]);
      } catch {
        setShowtimesByDate([]);
      } finally {
        setLoadingShowtimes(false);
      }
    };
    load();
  }, [selectedCinemaId, movieId, selectedDate]);

  const currentShowtimes =
    showtimesByDate.find((g) => g.date === selectedDate)?.showtimes ?? [];

  const cinemaRoomCountMap = useMemo(() => {
    const roomMap = new Map<number, Set<number>>();

    for (const showtime of movieShowtimes) {
      if (showtime.status !== "OPEN" || !showtime.cinema_id || !showtime.room_id) {
        continue;
      }

      const cinemaRooms = roomMap.get(showtime.cinema_id) || new Set<number>();
      cinemaRooms.add(showtime.room_id);
      roomMap.set(showtime.cinema_id, cinemaRooms);
    }

    const roomCountMap = new Map<number, number>();
    roomMap.forEach((roomIds, cinemaId) => {
      roomCountMap.set(cinemaId, roomIds.size);
    });
    return roomCountMap;
  }, [movieShowtimes]);

  const cinemaOptions = useMemo(() => {
    return [...cinemas]
      .sort((a, b) => {
        const aRooms = cinemaRoomCountMap.get(a.id) || 0;
        const bRooms = cinemaRoomCountMap.get(b.id) || 0;

        if (bRooms !== aRooms) {
          return bRooms - aRooms;
        }

        return a.name.localeCompare(b.name, "vi");
      })
      .map((cinema) => {
        const roomCount = cinemaRoomCountMap.get(cinema.id) || 0;
        return {
          value: cinema.id,
          label: `${cinema.name} (${cinema.city})${
            roomCount > 0 ? ` (${roomCount} phòng có suất)` : " (hết phòng)"
          }`,
          disabled: roomCount === 0,
        };
      });
  }, [cinemas, cinemaRoomCountMap]);

  const selectedCinemaShowtimeDateSet = useMemo(() => {
    if (!selectedCinemaId) {
      return new Set<string>();
    }

    return new Set(
      movieShowtimes
        .filter(
          (showtime) =>
            showtime.status === "OPEN" &&
            showtime.cinema_id === selectedCinemaId &&
            getShowDate(showtime) >= getTodayDateKey()
        )
        .map(getShowDate)
    );
  }, [movieShowtimes, selectedCinemaId]);

  useEffect(() => {
    if (!selectedCinemaId || selectedCinemaShowtimeDateSet.has(selectedDate)) {
      return;
    }

    const firstAvailableDate = next30Days.find((day) =>
      selectedCinemaShowtimeDateSet.has(day)
    );

    if (firstAvailableDate) {
      setSelectedDate(firstAvailableDate);
    }
  }, [next30Days, selectedCinemaId, selectedCinemaShowtimeDateSet, selectedDate]);

  const selectedSeatRows = seats.filter((seat) => selectedSeats.includes(seat.id));

  // Food helpers
  const foodMap = useMemo(() => {
    return new Map(foods.map((food) => [food.id, food]));
  }, [foods]);

  const orderFoodSizes = useMemo(() => {
    return [...foodSizes].sort((a, b) => {
      const foodA = foodMap.get(a.food_id);
      const foodB = foodMap.get(b.food_id);
      const categoryA = foodA?.category_name || "";
      const categoryB = foodB?.category_name || "";
      const isComboA = COMBO_NAME_PATTERN.test(a.food_name.trim()) || categoryA === "Combo";
      const isComboB = COMBO_NAME_PATTERN.test(b.food_name.trim()) || categoryB === "Combo";

      if (isComboA !== isComboB) {
        return isComboA ? -1 : 1;
      }

      const categoryDiff = categoryA.localeCompare(categoryB, "vi");
      if (categoryDiff !== 0) return categoryDiff;

      const comboNumberDiff = getComboNumber(a.food_name) - getComboNumber(b.food_name);
      if (comboNumberDiff !== 0) return comboNumberDiff;

      const nameDiff = a.food_name.localeCompare(b.food_name, "vi");
      if (nameDiff !== 0) return nameDiff;

      return getSizeOrder(a.size_name) - getSizeOrder(b.size_name);
    });
  }, [foodMap, foodSizes]);

  const handleAddFood = (sizeId: number) => {
    const size = foodSizes.find((s) => s.id === sizeId);
    if (!size) return;

    setSelectedFoods((prev) => {
      const existing = prev.find((f) => f.sizeId === sizeId);
      if (existing) {
        return prev.map((f) =>
          f.sizeId === sizeId ? { ...f, quantity: f.quantity + 1 } : f
        );
      }
      return [
        ...prev,
        {
          sizeId: size.id,
          food_id: size.food_id,
          food_name: size.food_name,
          size_name: size.size_name,
          price: Number(size.price),
          quantity: 1,
        },
      ];
    });
  };

  const handleRemoveFood = (sizeId: number) => {
    setSelectedFoods((prev) => {
      const existing = prev.find((f) => f.sizeId === sizeId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((f) => f.sizeId !== sizeId);
      }
      return prev.map((f) =>
        f.sizeId === sizeId ? { ...f, quantity: f.quantity - 1 } : f
      );
    });
  };

  const seatTotal = useMemo(
    () => selectedSeatRows.reduce((sum, seat) => sum + Number(seat.price || 0), 0),
    [selectedSeatRows]
  );
  const foodTotal = useMemo(
    () => selectedFoods.reduce((sum, f) => sum + f.price * f.quantity, 0),
    [selectedFoods]
  );
  const hasFreePopcornBenefit = useMemo(
    () => Boolean(membershipInfo?.benefits.some((benefit) => benefit.benefit_key === "FREE_POPCORN")),
    [membershipInfo]
  );
  const freePopcornDiscount = useMemo(() => {
    if (!useFreePopcorn || !hasFreePopcornBenefit) return 0;
    const comboOne = selectedFoods.find((food) => /^combo\s*1$/i.test(food.food_name.trim()));
    return comboOne && comboOne.quantity > 0 ? comboOne.price : 0;
  }, [hasFreePopcornBenefit, selectedFoods, useFreePopcorn]);
  const membershipDiscount = useMemo(() => {
    if (!membershipInfo || membershipInfo.tier.discount_percent === 0) return 0;
    return Math.round((seatTotal * membershipInfo.tier.discount_percent) / 100);
  }, [seatTotal, membershipInfo]);
  const tuesdayDiscount = useMemo(() => {
    if (!selectedShowtime || seatTotal === 0 || !isTuesdayDateKey(getShowDate(selectedShowtime))) {
      return 0;
    }

    return Math.round(seatTotal * 0.5);
  }, [seatTotal, selectedShowtime]);

  const totalBeforeDiscount = seatTotal + foodTotal;
  const finalAmount = Math.max(
    totalBeforeDiscount - membershipDiscount - tuesdayDiscount - discount - freePopcornDiscount,
    0
  );
  const hasAppliedDiscounts =
    membershipDiscount > 0 || tuesdayDiscount > 0 || discount > 0 || freePopcornDiscount > 0;
  const vipPointsAvailable = membershipInfo?.points_available || 0;
  const vipPointsNeeded = Math.ceil(finalAmount / 1000);
  const canPayWithVipPoints = loggedIn && finalAmount > 0 && vipPointsAvailable >= vipPointsNeeded;

  const handleChooseShowtime = async (showtime: ApiShowtime) => {
    setSelectedShowtime(showtime);
    setSelectedSeats([]);
    setDiscount(0);
    setAppliedPromotionCode("");
    setMessage("");
    try {
      setSeats(await getSeatsByShowtime(showtime.id));
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không tải được ghế.");
    }
  };

  const handleToggleSeat = (seat: ApiSeat) => {
    if (seat.is_booked) return;
    setSelectedSeats((current) =>
      current.includes(seat.id) ? current.filter((sId) => sId !== seat.id) : [...current, seat.id]
    );
  };

  const handlePromotionCodeChange = (value: string) => {
    setPromotionCode(value);
    setAppliedPromotionCode("");
    setDiscount(0);
  };

  const handleApplyPromotion = async () => {
    try {
      const data: any = await applyPromotion({ code: promotionCode, total_amount: totalBeforeDiscount });
      setDiscount(Number(data.discount_amount || 0));
      setAppliedPromotionCode(promotionCode.trim());
      setMessage("✅ Áp dụng mã khuyến mãi thành công!");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Mã khuyến mãi không hợp lệ.");
    }
  };

  const handleSubmitRating = async () => {
    if (!canRateMovie?.bookingId) {
      setMessage(canRateMovie?.reason || "Bạn có thể đánh giá sau khi xem phim.");
      return;
    }

    setRatingLoading(true);
    setMessage("");
    try {
      const ratings = await createMovieRating(movieId, {
        bookingId: canRateMovie.bookingId,
        rating: ratingValue,
        comment: ratingComment,
      });

      setRatingReviews(ratings.reviews || []);
      const latestMovie = await getMovieById(movieId);
      setMovie({
        ...latestMovie,
        rating: ratings.average_rating || latestMovie.rating,
        total_ratings: ratings.total_ratings ?? latestMovie.total_ratings,
      });
      await loadRatingState();
      setRatingComment("");
      setCanRateMovie({
        canRate: false,
        reason: "Bạn đã đánh giá phim này.",
      });
      setMessage("Đánh giá thành công! Bạn được cộng 1 điểm VIP.");
      getMyMembership()
        .then(setMembershipInfo)
        .catch(() => {});
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không gửi được đánh giá.");
    } finally {
      setRatingLoading(false);
    }
  };

  // Generate random transfer content
  const generateTransferContent = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CK ${code}`;
  };

  const buildFoodPayload = () =>
    selectedFoods.map((f) => ({
      food_id: f.food_id,
      size_name: f.size_name,
      quantity: f.quantity,
    }));

  // Create the pending booking first, then show transfer instructions.
  const handlePayAndBook = async () => {
    if (!loggedIn) {
      setMessage("⚠️ Bạn cần đăng nhập trước khi đặt vé.");
      return;
    }
    if (!selectedShowtime || selectedSeats.length === 0) {
      setMessage("⚠️ Chọn suất chiếu và ghế trước khi đặt vé.");
      return;
    }

    if (ageRestricted) {
      setMessage(`Bạn chưa đủ ${minimumAge} tuổi để đặt vé phim ${movie?.age_rating}.`);
      return;
    }

    const nextTransferContent = generateTransferContent();
    setBookingLoading(true);
    setMessage("");
    setTransferContent(nextTransferContent);
    setShowPaymentModal(true);
    try {
      const foodPayload = buildFoodPayload();

      // Step 1: Create booking (stays PENDING)
      const booking: any = await createBooking({
        showtime_id: selectedShowtime.id,
        seat_ids: selectedSeats,
        foods: foodPayload,
        promotion_code: appliedPromotionCode || undefined,
        use_free_popcorn: freePopcornDiscount > 0,
      });

      setTicketData(booking);
      setPromotionCode("");
      setAppliedPromotionCode("");
      setDiscount(0);
      if (freePopcornDiscount > 0) {
        localStorage.removeItem("cinemax_use_free_popcorn");
        setUseFreePopcorn(false);
        getMyMembership()
          .then(setMembershipInfo)
          .catch(() => {});
      }

      try {
        // Step 2: Create payment as BANK_TRANSFER (stays PENDING, no auto-confirm).
        await createPayment({
          booking_id: booking.id,
          payment_method: "BANK_TRANSFER",
          amount: finalAmount,
          transfer_content: nextTransferContent,
        });

        const detail = await getBookingDetail(booking.id);
        setTicketData(detail);
      } catch {
        setMessage(
          "Đơn đã được lưu ở trạng thái chờ duyệt. Nếu admin chưa thấy nội dung chuyển khoản, hãy chạy migration BANK_TRANSFER."
        );
      }
    } catch (error: any) {
      setShowPaymentModal(false);
      setTransferContent("");
      setMessage(error.response?.data?.message || "Không tạo được booking.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePayWithVipPoints = async () => {
    if (!loggedIn) {
      setMessage("Bạn cần đăng nhập trước khi thanh toán.");
      return;
    }
    if (!selectedShowtime || selectedSeats.length === 0) {
      setMessage("Chọn suất chiếu và ghế trước khi thanh toán.");
      return;
    }
    if (ageRestricted) {
      setMessage(`Bạn chưa đủ ${minimumAge} tuổi để đặt vé phim ${movie?.age_rating}.`);
      return;
    }
    if (!canPayWithVipPoints) {
      setMessage(`Bạn cần ${vipPointsNeeded} điểm VIP để thanh toán đơn này.`);
      return;
    }

    setBookingLoading(true);
    setMessage("");
    try {
      const booking: any = await createBooking({
        showtime_id: selectedShowtime.id,
        seat_ids: selectedSeats,
        foods: buildFoodPayload(),
        points_to_use: vipPointsNeeded,
        promotion_code: appliedPromotionCode || undefined,
        use_free_popcorn: freePopcornDiscount > 0,
      });

      await createPayment({
        booking_id: booking.id,
        payment_method: "CASH",
        amount: 0,
      });

      const detail = await getBookingDetail(booking.id);
      setTicketData(detail);
      setPromotionCode("");
      setAppliedPromotionCode("");
      setDiscount(0);
      setShowPaymentModal(false);
      setTransferContent("");
      setMessage("Đơn thanh toán bằng điểm VIP đang chờ admin duyệt.");
      if (freePopcornDiscount > 0) {
        localStorage.removeItem("cinemax_use_free_popcorn");
        setUseFreePopcorn(false);
      }
      getMyMembership()
        .then(setMembershipInfo)
        .catch(() => {});
    } catch (error: any) {
      setAppliedPromotionCode("");
      setMessage(error.response?.data?.message || "Không thanh toán được bằng điểm VIP.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleConfirmTransfer = () => {
    setShowPaymentModal(false);
  };

  const handleNewBooking = () => {
    setTicketData(null);
    setSelectedSeats([]);
    setDiscount(0);
    setPromotionCode("");
    setAppliedPromotionCode("");
    setSelectedFoods([]);
    setMessage("");
    // Reload seats to reflect newly booked seats
    if (selectedShowtime) {
      handleChooseShowtime(selectedShowtime);
    }
  };

  if (loadingPage) {
    return (
      <section className="app-page">
        <div className="container" style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Spin size="large" />
        </div>
      </section>
    );
  }

  // Count booked vs available seats for legend
  const bookedCount = seats.filter((s) => s.is_booked).length;
  const availableCount = seats.length - bookedCount;

  return (
    <section className="app-page">
      <div className="container">
        {/* Movie header */}
        <div className="movie-detail-header">
          {movie?.poster_url && (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="movie-detail-poster"
            />
          )}
          <div>
            <p className="eyebrow">Đặt vé</p>
            <h1>{movie?.title || "Chi tiết phim"}</h1>
            <p className="muted" style={{ marginBottom: 8 }}>{movie?.description}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              {movie?.duration && <Tag color="blue">⏱ {movie.duration} phút</Tag>}
              {movie?.language && <Tag color="cyan">🌐 {movie.language}</Tag>}
              {movie?.age_rating && <Tag color="red">{movie.age_rating}</Tag>}
              <Tag color="gold">
                ⭐ {Number(movie?.rating || 0).toFixed(1)} ({Number(movie?.total_ratings || 0)} đánh giá)
              </Tag>
              {movie?.director && <Tag color="purple">🎬 {movie.director}</Tag>}
            </div>
            {movie?.genres && movie.genres.length > 0 && (
              <div className="genre-list" style={{ marginTop: 10 }}>
                {movie.genres.map((g) => (
                  <span key={g}>{g}</span>
                ))}
              </div>
            )}
            {movie?.trailer_url && (
              <a
                className="movie-trailer-link"
                href={movie.trailer_url}
                target="_blank"
                rel="noreferrer"
              >
                Xem trailer
              </a>
            )}
          </div>
        </div>

        {!showBookingFlow && (
        <section className="movie-reviews-section">
          <div className="movie-reviews-heading">
            <div>
              <p className="eyebrow">CINEMAX</p>
              <h2>Đánh giá phim</h2>
            </div>
            <div className="movie-review-score">
              <span>⭐ {Number(movie?.rating || 0).toFixed(1)}</span>
              <small>{Number(movie?.total_ratings || 0)} đánh giá</small>
            </div>
          </div>

          {canRateMovie?.canRate ? (
            <div className="movie-rating-form">
              <label>
                Điểm đánh giá
                <select
                  value={ratingValue}
                  onChange={(event) => setRatingValue(Number(event.target.value))}
                >
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nhận xét
                <textarea
                  rows={3}
                  placeholder="Chia sẻ cảm nhận của bạn về bộ phim"
                  value={ratingComment}
                  onChange={(event) => setRatingComment(event.target.value)}
                />
              </label>
              <button
                className="primary-btn form-submit movie-rating-submit"
                disabled={ratingLoading}
                onClick={handleSubmitRating}
              >
                {ratingLoading ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </div>
          ) : (
            <p className="movie-rating-note">
              {canRateMovie?.reason || "Bạn có thể đánh giá sau khi xem phim."}
            </p>
          )}

          <div className="movie-review-list">
            {ratingReviews.length === 0 ? (
              <p className="muted">Chưa có đánh giá nào.</p>
            ) : (
              ratingReviews.map((review) => (
                <article className="movie-review-card" key={review.id}>
                  <div className="movie-review-card-head">
                    <strong>{review.full_name}</strong>
                    <span>⭐ {Number(review.rating).toFixed(1)}</span>
                  </div>
                  {review.comment && <p>{review.comment}</p>}
                  <time dateTime={review.created_at}>
                    {new Date(review.created_at).toLocaleDateString("vi-VN")}
                  </time>
                </article>
              ))
            )}
          </div>
        </section>
        )}

        {message && <p className="section-state warning">{message}</p>}

        {/* Login prompt */}
        {showBookingFlow && !loggedIn && (
          <div className="auth-prompt-banner">
            <span>⚠️ Bạn cần đăng nhập để đặt vé.</span>
            <Link to="/auth" className="primary-btn compact">
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {showBookingFlow && ageRestricted && (
          <div className="auth-prompt-banner warning">
            <span>
              Phim này dành cho khán giả từ {minimumAge} tuổi.
              Tài khoản của bạn hiện
              {currentUserAge === null ? " chưa có ngày sinh hợp lệ" : ` ${currentUserAge} tuổi`}.
            </span>
          </div>
        )}

        {showBookingFlow && loggedIn && currentUser && (
          <div className="user-welcome-banner">
            <span>👋 Xin chào, <strong>{currentUser.full_name}</strong> ({currentUser.email})</span>
          </div>
        )}

        {/* Steps indicator */}
        {showBookingFlow && <div className="booking-steps-wrap">
          <Steps
            current={currentStep}
            size="small"
            items={[
              { title: "Chọn rạp" },
              { title: "Chọn suất" },
              { title: "Chọn ghế" },
              { title: "Thanh toán" },
              { title: "Hoàn thành" },
            ]}
          />
        </div>}

        {/* Ticket already booked — pending approval state */}
        {showBookingFlow && ticketData && (
          <div className="ticket-success-section">
            <Result
              status={ticketData.booking_status === "CONFIRMED" ? "success" : "info"}
              title={ticketData.booking_status === "CONFIRMED" ? "🎉 Đặt vé thành công!" : "⏳ Đơn hàng đang chờ duyệt"}
              subTitle={ticketData.booking_status === "CONFIRMED"
                ? `Mã booking: ${ticketData.booking_code}`
                : `Mã booking: ${ticketData.booking_code} — Vui lòng chờ admin xác nhận thanh toán`}
            />
            <div className="ticket-card">
              <div className="ticket-card-header">
                <span className="ticket-brand">🎬 CINEMAX</span>
                <span className="ticket-code">{ticketData.booking_code}</span>
              </div>
              <div className="ticket-card-body">
                <div className="ticket-row">
                  <span className="ticket-label">Phim</span>
                  <span className="ticket-value">{ticketData.movie_title}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">Rạp</span>
                  <span className="ticket-value">{ticketData.cinema_name}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">Phòng</span>
                  <span className="ticket-value">{ticketData.room_name}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">Giờ chiếu</span>
                  <span className="ticket-value">
                    {new Date(ticketData.start_time).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">Ghế</span>
                  <span className="ticket-value ticket-seats">
                    {(ticketData.seats || []).map((s: any) => (
                      <Tag key={s.id} color="red" style={{ fontWeight: 700 }}>
                        {s.seat_row}{s.seat_number}
                      </Tag>
                    ))}
                  </span>
                </div>
                {ticketData.foods && ticketData.foods.length > 0 && (
                  <div className="ticket-row">
                    <span className="ticket-label">Đồ ăn</span>
                    <span className="ticket-value">
                      {ticketData.foods.map((f: any) => `${f.name} (${f.size_name}) x${f.quantity}`).join(", ")}
                    </span>
                  </div>
                )}
                <div className="ticket-divider" />
                <div className="ticket-row total">
                  <span className="ticket-label">Tổng tiền</span>
                  <span className="ticket-value">{formatCurrency(ticketData.total_amount)}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">Trạng thái</span>
                  {ticketData.booking_status === "CONFIRMED" ? (
                    <Tag color="green" style={{ fontWeight: 700, fontSize: 13 }}>
                      ✅ Đã duyệt
                    </Tag>
                  ) : ticketData.booking_status === "CANCELLED" ? (
                    <Tag color="red" style={{ fontWeight: 700, fontSize: 13 }}>
                      ❌ Đã hủy
                    </Tag>
                  ) : (
                    <Tag color="orange" style={{ fontWeight: 700, fontSize: 13 }}>
                      ⏳ Chờ duyệt
                    </Tag>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button className="primary-btn" onClick={handleNewBooking}>
                Đặt thêm vé
              </button>
              <Link to="/bookings" className="ghost-btn compact" style={{ textDecoration: "none" }}>
                Xem lịch sử đặt vé
              </Link>
            </div>
          </div>
        )}

        {/* Booking flow — only show if no ticket yet */}
        {showBookingFlow && !ticketData && (
          <div className="booking-flow-stacked">
              {/* Step 1: Chọn rạp */}
              <div className="data-card">
                <h2>1. Chọn rạp và ngày chiếu</h2>
                <div className="booking-picker-row">
                  <Select
                    id="select-cinema"
                    showSearch
                    placeholder="-- Chọn rạp phim --"
                    style={{ width: "100%" }}
                    optionFilterProp="label"
                    options={cinemaOptions}
                    onChange={(val: number) => {
                      setSelectedCinemaId(val);
                      setSelectedShowtime(null);
                      setSelectedSeats([]);
                      setSeats([]);
                    }}
                    value={selectedCinemaId}
                  />
                  <input
                    aria-label="Chọn ngày chiếu"
                    className="booking-date-input"
                    min={next30Days[0]}
                    max={next30Days[next30Days.length - 1]}
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value || next30Days[0]);
                      setSelectedShowtime(null);
                      setSelectedSeats([]);
                      setSeats([]);
                    }}
                  />
                </div>

                {/* Step 2: Tab ngày + suất chiếu */}
                {selectedCinemaId && (
                  <>
                    {loadingShowtimes ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <Spin />
                      </div>
                    ) : (
                      <>
                        <div className="date-tabs" style={{ marginTop: 20 }}>
                          {next30Days.map((day) => {
                            const hasShowtime = selectedCinemaShowtimeDateSet.has(day);
                            return (
                              <button
                                key={day}
                                id={`date-${day}`}
                                className={[
                                  "date-tab-btn",
                                  hasShowtime ? "has-showtime" : "disabled",
                                  selectedDate === day ? "active" : "",
                                ].join(" ")}
                                disabled={!hasShowtime}
                                onClick={() => setSelectedDate(day)}
                              >
                                {formatTabLabel(day)}
                              </button>
                            );
                          })}
                        </div>

                        {currentShowtimes.length === 0 ? (
                          <Empty description="Không có suất chiếu" style={{ color: "#888", marginTop: 16 }} />
                        ) : (
                          <div className="showtime-btn-grid" style={{ marginTop: 14 }}>
                            {currentShowtimes.map((st) => (
                              <button
                                id={`st-btn-${st.id}`}
                                key={st.id}
                                className={`showtime-btn ${selectedShowtime?.id === st.id ? "active" : ""}`}
                                onClick={() => handleChooseShowtime(st)}
                              >
                                <span className="showtime-btn-time">
                                  {new Date(st.start_time).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span className="showtime-btn-room">{st.room_name}</span>
                                <Tag
                                  style={{
                                    background: ROOM_TYPE_COLOR[st.room_type] || "#333",
                                    border: "none",
                                    color: "#fff",
                                    fontSize: 10,
                                  }}
                                >
                                  {st.room_type}
                                </Tag>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Step 3: Chọn ghế */}
              <div className="data-card">
                <h2>2. Chọn ghế</h2>
                {!selectedShowtime && <p className="muted">Chọn suất chiếu để tải sơ đồ ghế.</p>}
                {selectedShowtime && seats.length === 0 && (
                  <p className="muted">Không có ghế cho suất này.</p>
                )}

                {selectedShowtime && seats.length > 0 && (
                  <>
                    {/* Screen indicator */}
                    <div className="screen-indicator">
                      <div className="screen-bar" />
                      <span>MÀN HÌNH</span>
                    </div>

                    {/* Seat grid */}
                    <div className="seat-grid">
                      {seats.map((seat) => (
                        <button
                          className={[
                            "seat-btn",
                            selectedSeats.includes(seat.id) ? "selected" : "",
                            seat.is_booked ? "booked" : "",
                            `seat-type-${(seat.seat_type || "NORMAL").toLowerCase()}`,
                          ].join(" ")}
                          key={seat.id}
                          disabled={Boolean(seat.is_booked)}
                          title={
                            seat.is_booked
                              ? "🔒 Ghế đã được đặt bởi người khác"
                              : `${formatCurrency(seat.price)} - ${seat.seat_type}`
                          }
                          onClick={() => handleToggleSeat(seat)}
                        >
                          {seat.seat_row}
                          {seat.seat_number}
                        </button>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="seat-legend">
                      <div className="legend-item">
                        <span className="legend-box available" />
                        <span>Trống ({availableCount})</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-box selected" />
                        <span>Đang chọn ({selectedSeats.length})</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-box booked" />
                        <span>Đã đặt ({bookedCount})</span>
                      </div>
                    </div>
                  </>
                )}

                {selectedSeatRows.length > 0 && (
                  <div className="selected-seats-summary">
                    <span>Đã chọn:</span>
                    {selectedSeatRows.map((s) => (
                      <Tag key={s.id} color="blue" style={{ fontWeight: 700 }}>
                        {s.seat_row}{s.seat_number} ({s.seat_type}) - {formatCurrency(s.price)}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>

              {/* Food + Promotion + Payment — stacked below */}
              <div className="checkout-section">
                <div className="checkout-row">
                  {/* Food */}
                  <div className="data-card">
                    <h2>3. Combo / đồ ăn thêm</h2>
                    <div className="food-selection-grid">
                      {orderFoodSizes.map((size) => {
                        const food = foodMap.get(size.food_id);
                        const selected = selectedFoods.find((f) => f.sizeId === size.id);
                        return (
                          <div className="food-item" key={size.id}>
                            <div className="food-item-main">
                              <img
                                className="food-item-image"
                                src={getFoodImage(food)}
                                alt={size.food_name}
                                loading="lazy"
                              />
                              <div className="food-item-info">
                                <strong>{size.food_name}</strong>
                                {food?.description && <small>{food.description}</small>}
                                {food?.category_name && <small>{food.category_name}</small>}
                                <small>Size {size.size_name}</small>
                                <span className="food-item-price">
                                  {useFreePopcorn &&
                                  hasFreePopcornBenefit &&
                                  /^combo\s*1$/i.test(size.food_name.trim())
                                    ? "Miễn phí 1 phần"
                                    : formatCurrency(size.price)}
                                </span>
                              </div>
                            </div>
                            <div className="food-item-actions">
                              <button
                                className="food-qty-btn"
                                onClick={() => handleRemoveFood(size.id)}
                                disabled={!selected}
                              >
                                −
                              </button>
                              <span className="food-qty-count">{selected?.quantity || 0}</span>
                              <button
                                className="food-qty-btn add"
                                onClick={() => handleAddFood(size.id)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {orderFoodSizes.length === 0 && (
                        <Empty description="Chưa có đồ ăn" style={{ color: "#888", marginTop: 16 }} />
                      )}
                    </div>
                  </div>

                  {/* Promotion */}
                  <div className="data-card">
                    <h2>Mã khuyến mãi</h2>
                    <div className="inline-form">
                      <input placeholder="Nhập mã: SALE10" value={promotionCode} onChange={(e) => handlePromotionCodeChange(e.target.value)} />
                      <button onClick={handleApplyPromotion}>Áp dụng</button>
                    </div>
                  </div>
                </div>

                {/* Payment summary */}
                <div className="data-card payment-summary-card">
                  <h2>4. Thanh toán</h2>
                  <div className="payment-line">
                    <span>Ghế ({selectedSeats.length})</span>
                    <span>{formatCurrency(seatTotal)}</span>
                  </div>
                  {selectedFoods.map((f) => (
                    <div className="payment-line" key={f.sizeId}>
                      <span>{f.food_name} ({f.size_name}) x{f.quantity}</span>
                      <span>{formatCurrency(f.price * f.quantity)}</span>
                    </div>
                  ))}

                  {hasAppliedDiscounts && (
                    <div className="payment-discount-list">
                      <strong>Ưu đãi áp dụng</strong>
                      {tuesdayDiscount > 0 && (
                        <div className="payment-line payment-discount-line">
                          <span>Thứ 3 vui vẻ - giảm 50% tiền vé</span>
                          <span>-{formatCurrency(tuesdayDiscount)}</span>
                        </div>
                      )}
                      {membershipDiscount > 0 && (
                        <div className="payment-line payment-discount-line">
                          <span>
                            VIP {membershipInfo?.tier.name} - giảm {membershipInfo?.tier.discount_percent}% tiền vé
                          </span>
                          <span>-{formatCurrency(membershipDiscount)}</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="payment-line payment-discount-line">
                          <span>Mã khuyến mãi</span>
                          <span>-{formatCurrency(discount)}</span>
                        </div>
                      )}
                      {freePopcornDiscount > 0 && (
                        <div className="payment-line payment-discount-line">
                          <span>Bỏng ngô miễn phí - Combo 1</span>
                          <span>-{formatCurrency(freePopcornDiscount)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="payment-divider" />
                  <div className="payment-line total">
                    <span>Tổng cộng</span>
                    <span>{formatCurrency(finalAmount)}</span>
                  </div>

                  <button
                    className="primary-btn form-submit pay-btn"
                    onClick={handlePayAndBook}
                    disabled={!loggedIn || ageRestricted || !selectedShowtime || selectedSeats.length === 0 || bookingLoading}
                  >
                    {bookingLoading ? (
                      <>⏳ Đang xử lý...</>
                    ) : !loggedIn ? (
                      <>🔐 Đăng nhập để thanh toán</>
                    ) : (
                      <>🎟 Thanh toán chuyển khoản</>
                    )}
                  </button>
                  <button
                    className="primary-btn form-submit pay-btn vip-point-pay-btn"
                    onClick={handlePayWithVipPoints}
                    disabled={
                      !loggedIn ||
                      ageRestricted ||
                      !selectedShowtime ||
                      selectedSeats.length === 0 ||
                      bookingLoading ||
                      !canPayWithVipPoints
                    }
                  >
                    {bookingLoading ? "Đang xử lý..." : "Dùng điểm VIP"}
                  </button>
                  <p className="muted" style={{ textAlign: "center", marginTop: 8, fontSize: 12 }}>
                    Chuyển khoản ngân hàng — Chờ admin duyệt
                  </p>
                  <p className={`muted vip-point-pay-note ${canPayWithVipPoints ? "ready" : "missing"}`}>
                    VIP: cần {vipPointsNeeded} điểm, hiện có {vipPointsAvailable} điểm
                  </p>
                </div>
              </div>
          </div>
        )}

        {/* Payment Modal with QR Code */}
        <Modal
          open={showPaymentModal}
          onCancel={() => setShowPaymentModal(false)}
          footer={null}
          centered
          width={520}
          className="payment-qr-modal"
          title={null}
        >
          <div className="payment-modal-content">
            <div className="payment-modal-header">
              <h2>💳 Thanh toán chuyển khoản</h2>
              <p className="muted">Quét mã QR hoặc chuyển khoản theo thông tin bên dưới</p>
            </div>

            {/* Booking summary */}
            <div className="payment-modal-summary">
              <div className="payment-modal-info-row">
                <span>🎬 Phim</span>
                <strong>{movie?.title}</strong>
              </div>
              {selectedShowtime && (
                <>
                  <div className="payment-modal-info-row">
                    <span>🏢 Rạp</span>
                    <strong>{selectedShowtime.cinema_name}</strong>
                  </div>
                  <div className="payment-modal-info-row">
                    <span>🚪 Phòng</span>
                    <strong>{selectedShowtime.room_name} ({selectedShowtime.room_type})</strong>
                  </div>
                  <div className="payment-modal-info-row">
                    <span>🕐 Giờ chiếu</span>
                    <strong>{new Date(selectedShowtime.start_time).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
                  </div>
                </>
              )}
              <div className="payment-modal-info-row">
                <span>💺 Ghế</span>
                <strong>{selectedSeatRows.map(s => `${s.seat_row}${s.seat_number}`).join(", ")}</strong>
              </div>
              {selectedFoods.length > 0 && (
                <div className="payment-modal-info-row">
                  <span>🍿 Combo</span>
                  <strong>{selectedFoods.map(f => `${f.food_name} (${f.size_name}) x${f.quantity}`).join(", ")}</strong>
                </div>
              )}
              <div className="payment-modal-info-row total">
                <span>💰 Tổng tiền</span>
                <strong>{formatCurrency(finalAmount)}</strong>
              </div>
            </div>

            {/* QR Code */}
            <div className="payment-qr-section">
              <img
                src={`https://img.vietqr.io/image/MB-123408052006-compact2.png?amount=${finalAmount}&addInfo=${encodeURIComponent(transferContent)}&accountName=CINEMAX`}
                alt="QR Chuyển khoản MBBank"
                className="payment-qr-image"
              />
            </div>

            {/* Bank info */}
            <div className="payment-bank-info">
              <div className="bank-info-row">
                <span>🏦 Ngân hàng</span>
                <strong>MBBank</strong>
              </div>
              <div className="bank-info-row">
                <span>📋 Số tài khoản</span>
                <strong className="account-number">123408052006</strong>
              </div>
              <div className="bank-info-row">
                <span>💰 Số tiền</span>
                <strong className="transfer-amount">{formatCurrency(finalAmount)}</strong>
              </div>
              <div className="bank-info-row transfer-content-row">
                <span>📝 Nội dung CK</span>
                <strong className="transfer-content-value">{transferContent}</strong>
              </div>
            </div>

            <p className="payment-modal-note">
              ⚠️ Vui lòng chuyển <strong>đúng số tiền</strong> và <strong>đúng nội dung</strong> để được duyệt nhanh nhất.
            </p>

            <button
              className="primary-btn form-submit pay-btn"
              onClick={handleConfirmTransfer}
              disabled={bookingLoading}
              style={{ width: "100%", marginTop: 12 }}
            >
              {bookingLoading ? "⏳ Đang xử lý..." : "✅ Tôi đã chuyển khoản"}
            </button>
          </div>
        </Modal>
      </div>
    </section>
  );
};

export default MovieDetailPage;
