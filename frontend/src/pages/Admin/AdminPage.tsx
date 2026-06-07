import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarClock,
  Clapperboard,
  CreditCard,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { notification } from "antd";

import AdminOverview from "./components/AdminOverview";
import AdminMovies from "./components/AdminMovies";
import ShowtimesSection from "./showtimes/showtimes";
import BookingsSection from "./bookings/bookings";
import UsersSection from "./users/user";
import FoodsSection from "./foods/FoodsSection";

import {
  createAdminMovie,
  createAdminShowtime,
  deleteAdminMovie,
  deleteAdminShowtime,
  getAdminBookings,
  getAdminUserDetail,
  getAdminUsers,
  getDashboardStats,
  updateAdminBookingStatus,
  updateAdminMovie,
  updateAdminShowtime,
  updateAdminUserRole,
  updateAdminUserStatus,
  deleteAdminUser,
  getAdminFoods,
  getAdminFoodSizes,
  createAdminFood,
  updateAdminFood,
  deleteAdminFood,
  createAdminFoodSize,
  updateAdminFoodSize,
  deleteAdminFoodSize,
  approveAllPendingBookings,
  createAdminBulkVoucher,
  createAdminUserVoucher,
} from "../../services/adminService";
import type { AdminBooking, AdminUser } from "../../services/adminService";
import { getMovies } from "../../services/movieService";
import { getShowtimes } from "../../services/showtimeService";
import { getCinemas } from "../../services/cinemaService";
import type { ApiMovie, ApiShowtime, ApiFood, ApiFoodSize, ApiCinema } from "../../types/api";
import { formatDateTime, parseLocalDateTime } from "../../utils/format";

type AdminTab = "overview" | "movies" | "showtimes" | "bookings" | "users" | "foods";

const MIN_HOURS_BEFORE_SHOWTIME = 3;
const SHOWTIME_MIN_MESSAGE = "Suất chiếu phải bắt đầu sau thời điểm hiện tại ít nhất 3 tiếng.";

const toDateTimeLocalValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const getMinShowtimeDate = () => {
  const now = new Date();
  now.setHours(now.getHours() + MIN_HOURS_BEFORE_SHOWTIME);
  return now;
};

const isValidShowtimeStart = (startTime: string) => {
  if (!startTime) return false;
  const selected = new Date(startTime);
  return selected.getTime() >= getMinShowtimeDate().getTime();
};

const formatMoney = (value?: string | number | null) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

type FoodForm = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  image_url: string;
};

type SizeForm = {
  id: string;
  size_name: "" | "S" | "M" | "L";
  price: string;
};

const emptyMovieForm = {
  id: "",
  title: "",
  description: "",
  director: "",
  duration: "",
  release_date: "",
  poster_url: "",
  trailer_url: "",
  language: "Vietnamese",
  age_rating: "T13",
  rating: "8.0",
  status: "NOW_SHOWING",
  genres: [] as string[],
};

const emptyShowtimeForm = {
  id: "",
  movie_id: "",
  cinema_id: "",
  room_id: "",
  start_time: "",
  end_time: "",
  status: "OPEN",
};

const emptyFoodForm: FoodForm = {
  id: "",
  category_id: "",
  name: "",
  description: "",
  image_url: "",
};

const emptySizeForm: SizeForm = {
  id: "",
  size_name: "",
  price: "",
};

const toDateTimeInputValue = (value?: string | null) => {
  const raw = String(value || "");
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    return raw.replace(" ", "T").slice(0, 16);
  }

  const date = parseLocalDateTime(raw);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [showtimes, setShowtimes] = useState<ApiShowtime[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [bookingFilters, setBookingFilters] = useState<{
    search: string;
    status: "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED";
    date_from: string;
    date_to: string;
    page: number;
    limit: number;
  }>({
    search: "",
    status: "ALL",
    date_from: "",
    date_to: "",
    page: 1,
    limit: 20,
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userFilters, setUserFilters] = useState({ role: "", search: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [movieForm, setMovieForm] = useState(emptyMovieForm);
  const [showtimeForm, setShowtimeForm] = useState(emptyShowtimeForm);
  const [cinemas, setCinemas] = useState<ApiCinema[]>([]);
  const [foods, setFoods] = useState<ApiFood[]>([]);
  const [foodForm, setFoodForm] = useState<FoodForm>(emptyFoodForm);
  const [selectedFood, setSelectedFood] = useState<ApiFood | null>(null);
  const [foodSizes, setFoodSizes] = useState<ApiFoodSize[]>([]);
  const [sizeForm, setSizeForm] = useState<SizeForm>(emptySizeForm);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [pendingNotifications, setPendingNotifications] = useState<AdminBooking[]>([]);
  const [pendingNotificationTotal, setPendingNotificationTotal] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

 const loadBookings = async (filters = bookingFilters) => {
  const bookingData = await getAdminBookings(filters);

  const items = Array.isArray(bookingData)
    ? bookingData
    : bookingData?.items ?? [];

  setBookings(items);
  setBookingTotal(
    Array.isArray(bookingData)
      ? items.length
      : bookingData?.total ?? items.length
  );

  setBookingFilters((current) => ({
    ...current,
    ...filters,
    page: Array.isArray(bookingData)
      ? filters.page
      : bookingData?.page ?? filters.page,
    limit: Array.isArray(bookingData)
      ? filters.limit
      : bookingData?.limit ?? filters.limit,
  }));
};

  const loadPendingNotifications = async () => {
    const pendingData = await getAdminBookings({
      status: "PENDING",
      page: 1,
      limit: 8,
    });

    const items = Array.isArray(pendingData)
      ? pendingData
      : pendingData?.items ?? [];

    setPendingNotifications(items);
    setPendingNotificationTotal(
      Array.isArray(pendingData)
        ? items.length
        : pendingData?.total ?? items.length
    );
  };

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsData, movieData, showtimeData, userData, foodsData, cinemaData] =
        await Promise.all([
          getDashboardStats(),
          getMovies({ page: 1, limit: 50 }),
          getShowtimes(),
          getAdminUsers(),
          getAdminFoods(),
          getCinemas(),
        ]);

      setStats(statsData);
      setMovies(movieData.items);
      setShowtimes(showtimeData);
      setUsers(userData);
      setFoods(foodsData);
      setCinemas(cinemaData);

      await Promise.all([loadBookings(), loadPendingNotifications()]);
      setMessage("");
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Không tải được dữ liệu quản trị. Vui lòng đăng nhập bằng tài khoản ADMIN."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadFoodSizes = async (foodId: number) => {
    try {
      const sizes = await getAdminFoodSizes(foodId);
      setFoodSizes(sizes);
    } catch (error: any) {
      setFoodSizes([]);
      notification.error({
        message: "Lỗi tải sizes",
        description: error.response?.data?.message || "Không tải được kích thước đồ ăn.",
      });
    }
  };

  const handleSelectFood = async (food: ApiFood) => {
    setSelectedFood(food);
    setFoodForm({
      id: String(food.id),
      category_id: String(food.category_id),
      name: food.name || "",
      description: food.description || "",
      image_url: food.image_url || "",
    });
    setSizeForm(emptySizeForm);
    await loadFoodSizes(food.id);
  };

  const handleSubmitFood = async (event: FormEvent) => {
    event.preventDefault();

    try {
      const payload = {
        name: foodForm.name,
        description: foodForm.description || null,
        image_url: foodForm.image_url || null,
        category_id: Number(foodForm.category_id),
      };

      if (foodForm.id) {
        const updatedFood = await updateAdminFood(Number(foodForm.id), payload);
        notification.success({
          message: "Cập nhật đồ ăn",
          description: "Đã cập nhật đồ ăn thành công.",
        });
        setSelectedFood(updatedFood);
        await loadFoodSizes(updatedFood.id);
      } else {
        const createdFood = await createAdminFood(payload);
        notification.success({
          message: "Thêm đồ ăn",
          description: "Đã thêm đồ ăn mới. Hãy thêm size và giá để món hiện ở trang đặt vé.",
        });
        setSelectedFood(createdFood);
        setFoodSizes([]);
      }

      setFoodForm(emptyFoodForm);
      await loadAdminData();
    } catch (error: any) {
      notification.error({
        message: "Lỗi lưu đồ ăn",
        description: error.response?.data?.message || "Không lưu được đồ ăn.",
      });
    }
  };

  const handleSubmitSize = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedFood) {
      notification.warning({
        message: "Vui lòng chọn đồ ăn",
        description: "Chọn một món ăn trước khi thêm hoặc sửa size.",
      });
      return;
    }

    try {
      const payload = {
        size_name: sizeForm.size_name as ApiFoodSize["size_name"],
        price: Number(sizeForm.price),
      };

      if (sizeForm.id) {
        await updateAdminFoodSize(Number(sizeForm.id), payload);
        notification.success({
          message: "Cập nhật size",
          description: "Đã cập nhật size đồ ăn thành công.",
        });
      } else {
        await createAdminFoodSize(selectedFood.id, payload);
        notification.success({
          message: "Thêm size",
          description: "Đã thêm size đồ ăn mới thành công.",
        });
      }

      setSizeForm(emptySizeForm);
      await loadFoodSizes(selectedFood.id);
    } catch (error: any) {
      notification.error({
        message: "Lỗi lưu size",
        description: error.response?.data?.message || "Không lưu được size đồ ăn.",
      });
    }
  };

  const handleEditFood = (food: ApiFood) => {
    setSelectedFood(food);
    setFoodForm({
      id: String(food.id),
      category_id: String(food.category_id),
      name: food.name || "",
      description: food.description || "",
      image_url: food.image_url || "",
    });
    loadFoodSizes(food.id);
  };

  const handleEditSize = (size: ApiFoodSize) => {
    setSizeForm({
      id: String(size.id),
      size_name: size.size_name,
      price: String(size.price),
    });
  };

  const handleClearSizeForm = () => {
    setSizeForm(emptySizeForm);
  };

  const handleDeleteFood = async (foodId: number) => {
    try {
      await deleteAdminFood(foodId);
      notification.success({
        message: "Xóa đồ ăn",
        description: "Đã xóa đồ ăn thành công.",
      });
      setSelectedFood((current) => (current?.id === foodId ? null : current));
      await loadAdminData();
    } catch (error: any) {
      notification.error({
        message: "Lỗi xóa đồ ăn",
        description: error.response?.data?.message || "Không xóa được đồ ăn.",
      });
    }
  };

  const handleDeleteFoodSize = async (foodSizeId: number) => {
    try {
      await deleteAdminFoodSize(foodSizeId);
      notification.success({
        message: "Xóa size",
        description: "Đã xóa size đồ ăn thành công.",
      });
      if (selectedFood) {
        await loadFoodSizes(selectedFood.id);
      }
    } catch (error: any) {
      notification.error({
        message: "Lỗi xóa size",
        description: error.response?.data?.message || "Không xóa được size đồ ăn.",
      });
    }
  };

  const handleDeleteShowtime = async (showtimeId: number) => {
    try {
      await deleteAdminShowtime(showtimeId);
      notification.success({
        message: "Xóa suất chiếu",
        description: "Đã xóa suất chiếu thành công.",
      });
      await loadAdminData();
    } catch (error: any) {
      notification.error({
        message: "Lỗi xóa suất chiếu",
        description: error.response?.data?.message || "Không xóa được suất chiếu.",
      });
    }
  };

  const handleDeleteMovie = async (movieId: number) => {
    try {
      await deleteAdminMovie(movieId);
      notification.success({
        message: "Xóa phim",
        description: "Đã xóa phim thành công.",
      });
      await loadAdminData();
    } catch (error: any) {
      notification.error({
        message: "Lỗi xóa phim",
        description: error.response?.data?.message || "Không xóa được phim.",
      });
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteAdminUser(userId);
      notification.success({
        message: "Xóa người dùng",
        description: "Đã xóa người dùng thành công.",
      });
      await loadAdminData();
    } catch (error: any) {
      notification.error({
        message: "Lỗi xóa người dùng",
        description: error.response?.data?.message || "Không xóa được người dùng.",
      });
    }
  };

  const maxMonthlyRevenue = useMemo(() => {
    const values =
      stats?.monthly_revenue?.map((item: any) => Number(item.revenue)) || [0];
    return Math.max(...values, 1);
  }, [stats]);

  const handleSubmitMovie = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const requiredFields = [
        movieForm.title,
        movieForm.description,
        movieForm.director,
        movieForm.duration,
        movieForm.release_date,
        movieForm.poster_url,
        movieForm.trailer_url,
        movieForm.language,
        movieForm.age_rating,
        movieForm.rating,
        movieForm.status,
      ];
      const ratingValue = Number(movieForm.rating);
      const durationValue = Number(movieForm.duration);

      if (
        requiredFields.some((value) => !String(value ?? "").trim()) ||
        !Array.isArray(movieForm.genres) ||
        movieForm.genres.length === 0
      ) {
        notification.warning({
          message: "Thiếu thông tin phim",
          description: "Vui lòng điền đủ tất cả các ô và chọn ít nhất 1 thể loại phim.",
        });
        return;
      }

      if (!Number.isFinite(durationValue) || durationValue <= 0) {
        notification.warning({
          message: "Thời lượng không hợp lệ",
          description: "Thời lượng phim phải lớn hơn 0 phút.",
        });
        return;
      }

      if (!Number.isFinite(ratingValue) || ratingValue < 0 || ratingValue > 10) {
        notification.warning({
          message: "Đánh giá không hợp lệ",
          description: "Đánh giá phim phải nằm trong khoảng từ 0 đến 10.",
        });
        return;
      }

      const payload = {
        title: movieForm.title.trim(),
        description: movieForm.description.trim(),
        director: movieForm.director.trim(),
        duration: durationValue,
        release_date: movieForm.release_date,
        poster_url: movieForm.poster_url.trim(),
        trailer_url: movieForm.trailer_url.trim(),
        language: movieForm.language.trim(),
        age_rating: movieForm.age_rating,
        rating: ratingValue,
        status: (movieForm.id
          ? movieForm.status
          : movieForm.status === "ENDED"
          ? "NOW_SHOWING"
          : movieForm.status) as ApiMovie["status"],
        genres: movieForm.genres,
      };

      if (movieForm.id) {
        await updateAdminMovie(Number(movieForm.id), payload);
        notification.success({
          message: "Cập nhật phim",
          description: "Đã cập nhật phim thành công.",
        });
      } else {
        await createAdminMovie(payload);
        notification.success({
          message: "Thêm phim",
          description: "Đã thêm phim mới thành công.",
        });
      }

      setMovieForm(emptyMovieForm);
      await loadAdminData();
    } catch (error: any) {
      notification.error({
        message: "Lỗi lưu phim",
        description: error.response?.data?.message || "Không lưu được phim.",
      });
    }
  };

  const handleSubmitShowtime = async (event: FormEvent) => {
    event.preventDefault();
    if (!showtimeForm.id && !isValidShowtimeStart(showtimeForm.start_time)) {
      notification.error({
        message: "Thời gian suất chiếu không hợp lệ",
        description: SHOWTIME_MIN_MESSAGE,
      });
      return;
    }

    try {
      const payload = {
        movie_id: Number(showtimeForm.movie_id),
        room_id: Number(showtimeForm.room_id),
        start_time: showtimeForm.start_time,
        end_time: showtimeForm.end_time,
        status: showtimeForm.status,
      };

      if (showtimeForm.id) {
        await updateAdminShowtime(Number(showtimeForm.id), payload);
        notification.success({
          message: "Cập nhật suất chiếu",
          description: "Đã cập nhật suất chiếu thành công.",
        });
      } else {
        await createAdminShowtime(payload);
        notification.success({
          message: "Thêm suất chiếu",
          description: "Đã thêm suất chiếu mới thành công.",
        });
      }

      setShowtimeForm(emptyShowtimeForm);
      await loadAdminData();
    } catch (error: any) {
      notification.error({
        message: "Lỗi lưu suất chiếu",
        description: error.response?.data?.message || "Không lưu được suất chiếu.",
      });
    }
  };

  const handleBookingStatus = async (
    bookingId: number,
    status: AdminBooking["booking_status"]
  ) => {
    try {
      await updateAdminBookingStatus(bookingId, status);
      notification.success({
        message: "Cập nhật đơn hàng",
        description:
          status === "CONFIRMED"
            ? "Đã xác nhận đơn hàng thành công."
            : "Đã hủy đơn hàng thành công.",
      });
      await Promise.all([loadBookings(), loadPendingNotifications()]);
    } catch (error: any) {
      notification.error({
        message: "Lỗi cập nhật đơn hàng",
        description: error.response?.data?.message || "Không cập nhật được đơn hàng.",
      });
    }
  };

  const handleApproveAllBookings = async () => {
    try {
      const result = await approveAllPendingBookings({
        search: bookingFilters.search || undefined,
        status: bookingFilters.status,
        date_from: bookingFilters.date_from || undefined,
        date_to: bookingFilters.date_to || undefined,
      });
      notification.success({
        message: "Duyệt tất cả đơn hàng",
        description:
          result.approved > 0
            ? `Đã duyệt ${result.approved} đơn hàng.`
            : "Không có đơn PENDING hợp lệ để duyệt.",
      });
      await Promise.all([loadBookings(), loadPendingNotifications()]);
    } catch (error: any) {
      notification.error({
        message: "Lỗi duyệt tất cả",
        description: error.response?.data?.message || "Không thể duyệt tất cả đơn hàng.",
      });
    }
  };

  const openPendingBookings = async () => {
    const nextFilters = {
      ...bookingFilters,
      status: "PENDING" as const,
      page: 1,
    };

    setIsNotificationOpen(false);
    setActiveTab("bookings");
    setBookingFilters(nextFilters);
    await loadBookings(nextFilters);
    await loadPendingNotifications();
  };

  const editMovie = (movie: ApiMovie) => {
    setMovieForm({
      id: String(movie.id),
      title: movie.title,
      description: movie.description || "",
      director: movie.director || "",
      duration: String(movie.duration || ""),
      release_date: toDateInputValue(movie.release_date),
      poster_url: movie.poster_url || "",
      trailer_url: movie.trailer_url || "",
      language: movie.language || "Vietnamese",
      age_rating: movie.age_rating || "T13",
      rating: String(movie.rating || "8.0"),
      status: movie.status,
      genres: movie.genres || [],
    });
    setActiveTab("movies");
  };

  const editShowtime = (showtime: ApiShowtime) => {
    setShowtimeForm({
      id: String(showtime.id),
      movie_id: String(showtime.movie_id),
      cinema_id: String(showtime.cinema_id || ""),
      room_id: String(showtime.room_id),
      start_time: toDateTimeInputValue(showtime.start_time),
      end_time: toDateTimeInputValue(showtime.end_time),
      status: showtime.status,
    });
    setActiveTab("showtimes");
  };

  const handleUserFilterChange = async (updates: Partial<typeof userFilters>) => {
    const newFilters = { ...userFilters, ...updates };
    setUserFilters(newFilters);

    try {
      const data = await getAdminUsers(newFilters);
      setUsers(data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không lọc được người dùng.");
    }
  };

  const handleUserRoleChange = async (userId: number, newRole: string) => {
    const user = users.find((u) => u.id === userId);

    if (user?.is_active === "BLOCKED") {
      notification.warning({
        message: "Hành động bị chặn",
        description: "Không thể thay đổi vai trò của tài khoản đang bị khóa.",
      });
      return;
    }

    try {
      await updateAdminUserRole(userId, newRole);

      notification.success({
        message: "Cập nhật vai trò",
        description: `Đã thay đổi vai trò người dùng thành ${newRole}.`,
      });

      await loadAdminData();
    } catch (error: any) {
      notification.error({
        message: "Lỗi cập nhật",
        description: error.response?.data?.message || "Không đổi được vai trò.",
      });
    }
  };

  const handleUserStatusChange = async (
    userId: number,
    status: "ACTIVE" | "BLOCKED"
  ) => {
    try {
      await updateAdminUserStatus(userId, status);

      notification.success({
        message: "Cập nhật trạng thái",
        description: status === "ACTIVE" ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.",
      });

      await loadAdminData();
    } catch (error: any) {
      notification.error({
        message: "Lỗi cập nhật",
        description: error.response?.data?.message || "Không cập nhật trạng thái được.",
      });
    }
  };

  const handleViewUserDetail = async (userId: number) => {
    try {
      const user = await getAdminUserDetail(userId);
      setSelectedUser(user);
      setIsUserModalVisible(true);
    } catch (error: any) {
      notification.error({
        message: "Lỗi",
        description: error.response?.data?.message || "Không lấy được chi tiết người dùng.",
      });
    }
  };

  const handleSendUserVoucher = async (
    userId: number,
    payload: { discount_amount: number; scope: "GENERAL" | "VIP" }
  ) => {
    try {
      const voucher = await createAdminUserVoucher(userId, payload);

      notification.success({
        message: "Đã gửi voucher",
        description: (
          <div className="admin-voucher-toast">
            <span>
              Mã <strong>{voucher.code}</strong> đã được gửi vào thông báo của khách hàng.
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(voucher.code)}
            >
              Copy
            </button>
          </div>
        ),
      });
    } catch (error: any) {
      notification.error({
        message: "Lỗi gửi voucher",
        description: error.response?.data?.message || "Không tạo được voucher.",
      });
    }
  };

  const handleSendBulkVoucher = async (payload: { discount_amount: number; code: string }) => {
    try {
      const voucher = await createAdminBulkVoucher(payload);

      notification.success({
        message: "Đã gửi voucher chung",
        description: (
          <div className="admin-voucher-toast">
            <span>
              Mã <strong>{voucher.code}</strong> đã gửi cho {voucher.sent_count || 0} tài khoản.
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(voucher.code)}
            >
              Copy
            </button>
          </div>
        ),
      });
    } catch (error: any) {
      notification.error({
        message: "Lỗi gửi voucher chung",
        description: error.response?.data?.message || "Không tạo được voucher chung.",
      });
    }
  };

  return (
    <section className="app-page admin-page">

      <div className="container">
        <div className="admin-hero">
          <div>
            <p className="eyebrow">Admin Console</p>
            <h1>Quản trị ứng dụng xem phim</h1>
            <p className="muted">Theo dõi doanh thu, đơn hàng, phim, suất chiếu và dữ liệu người dùng.</p>
          </div>

          <div className="admin-hero-actions">
            <div className="admin-notification-wrap">
              <button
                className="secondary-btn compact admin-bell-btn"
                type="button"
                onClick={() => setIsNotificationOpen((current) => !current)}
                title="Đơn hàng chưa duyệt"
              >
                <Bell size={18} />
                {pendingNotificationTotal > 0 && (
                  <span className="admin-notification-badge">
                    {pendingNotificationTotal > 99 ? "99+" : pendingNotificationTotal}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="admin-notification-panel">
                  <div className="admin-notification-header">
                    <div>
                      <strong>Thông báo</strong>
                      <span>{pendingNotificationTotal} đơn chưa duyệt</span>
                    </div>

                    <button type="button" onClick={openPendingBookings}>
                      Xem tất cả
                    </button>
                  </div>

                  <div className="admin-notification-tabs">
                    <span className="active">Chưa duyệt</span>
                  </div>

                  <div className="admin-notification-list">
                    {pendingNotifications.length > 0 ? (
                      pendingNotifications.map((booking) => (
                        <button
                          type="button"
                          className="admin-notification-item"
                          key={booking.id}
                          onClick={openPendingBookings}
                        >
                          <span className="admin-notification-dot" />
                          <div>
                            <strong>{booking.booking_code}</strong>
                            <p>
                              {booking.customer_name || "Khách hàng"} đặt {booking.movie_title}
                            </p>
                            <small>
                              {formatDateTime(booking.start_time)} · {formatMoney(booking.total_amount)}
                            </small>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="admin-notification-empty">Không có đơn hàng chưa duyệt.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              className="secondary-btn compact admin-refresh"
              onClick={loadAdminData}
              disabled={isLoading}
            >
              <RefreshCw size={18} />
              Tải lại
            </button>
          </div>
        </div>

        {message && <p className="section-state warning">{message}</p>}

        <div className="admin-tabs">
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            <BarChart3 size={18} /> Tổng quan
          </button>

          <button className={activeTab === "movies" ? "active" : ""} onClick={() => setActiveTab("movies")}
          >
            <Clapperboard size={18} /> Phim
          </button>

          <button
            className={activeTab === "foods" ? "active" : ""}
            onClick={() => setActiveTab("foods")}
          >
            <Plus size={18} /> Đồ ăn
          </button>

          <button
            className={activeTab === "showtimes" ? "active" : ""}
            onClick={() => setActiveTab("showtimes")}
          >
            <CalendarClock size={18} /> Suất chiếu
          </button>

          <button
            className={activeTab === "bookings" ? "active" : ""}
            onClick={() => setActiveTab("bookings")}
          >
            <CreditCard size={18} /> Đơn hàng
          </button>

          <button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}
          >
            <Users size={18} /> Người dùng
          </button>
        </div>

        {activeTab === "overview" && (
          <AdminOverview
            stats={stats}
            maxMonthlyRevenue={maxMonthlyRevenue}
          />
        )}

        {activeTab === "movies" && (
          <AdminMovies
            movies={movies}
            movieForm={movieForm}
            setMovieForm={setMovieForm}
            handleSubmitMovie={handleSubmitMovie}
            editMovie={editMovie}
            loadAdminData={loadAdminData}
            handleDeleteMovie={handleDeleteMovie}
          />
        )}

        {activeTab === "foods" && (
          <FoodsSection
            foods={foods}
            foodForm={foodForm}
            setFoodForm={setFoodForm}
            selectedFood={selectedFood}
            foodSizes={foodSizes}
            sizeForm={sizeForm}
            setSizeForm={setSizeForm}
            handleSubmitFood={handleSubmitFood}
            handleSubmitSize={handleSubmitSize}
            handleSelectFood={handleSelectFood}
            handleEditFood={handleEditFood}
            handleEditSize={handleEditSize}
            handleDeleteFood={handleDeleteFood}
            handleDeleteFoodSize={handleDeleteFoodSize}
            handleClearSizeForm={handleClearSizeForm}
          />
        )}

        {activeTab === "showtimes" && (
          <ShowtimesSection
            showtimes={showtimes}
            movies={movies}
            cinemas={cinemas}
            showtimeForm={showtimeForm}
            setShowtimeForm={setShowtimeForm}
            handleSubmitShowtime={handleSubmitShowtime}
            editShowtime={editShowtime}
            deleteShowtime={handleDeleteShowtime}
            formatDateTime={formatDateTime}
            minShowtimeDateTime={toDateTimeLocalValue(getMinShowtimeDate())}
          />
        )}

        {activeTab === "bookings" && (
        <BookingsSection
          bookings={bookings}
          total={bookingTotal}
          filters={bookingFilters}
         onBookingFilterChange={async (updates) => {
        const nextFilters = {
          ...bookingFilters,
           ...updates,
    };

    setBookingFilters(nextFilters);
    await loadBookings(nextFilters);
  }}
  handleBookingStatus={handleBookingStatus}
  handleApproveAllBookings={handleApproveAllBookings}
/>
        )}

        {activeTab === "users" && (
          <UsersSection
            users={users}
            userFilters={userFilters}
            onUserFilterChange={handleUserFilterChange}
            onUserRoleChange={handleUserRoleChange}
            onUserStatusChange={handleUserStatusChange}
            onViewUserDetail={handleViewUserDetail}
            onSendUserVoucher={handleSendUserVoucher}
            onSendBulkVoucher={handleSendBulkVoucher}
            onDeleteUser={handleDeleteUser}
            selectedUser={selectedUser}
            isUserModalVisible={isUserModalVisible}
            setIsUserModalVisible={setIsUserModalVisible}
          />
        )}
      </div>
    </section>
  );
};

export default AdminPage;
