export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ApiMovie = {
  id: number;
  title: string;
  description: string | null;
  director: string | null;
  duration: number | null;
  release_date: string | null;
  poster_url: string | null;
  trailer_url: string | null;
  language: string | null;
  age_rating: string | null;
  rating: string | number | null;
  total_ratings?: number | string | null;
  status: "COMING_SOON" | "NOW_SHOWING" | "ENDED";
  booking_count?: number | string;
  genres: string[];
};

export type ApiMovieRating = {
  id: number;
  user_id: number;
  full_name: string;
  rating: string | number;
  comment: string | null;
  created_at: string;
};

export type ApiMovieRatings = {
  reviews: ApiMovieRating[];
  average_rating: string | number;
  total_ratings: number | string;
};

export type ApiCanRateMovie = {
  canRate: boolean;
  reason: string;
  bookingId?: number;
};

export type PaginatedMovies<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ApiShowtime = {
  id: number;
  movie_id: number;
  movie_title: string;
  room_id: number;
  room_name: string;
  room_type: string;
  room_total_seats?: number | string;
  cinema_id?: number;
  cinema_name: string;
  start_time: string;
  end_time: string;
  status: "OPEN" | "FULL" | "CANCELLED";
  show_date?: string;
};

export type ApiSeat = {
  id: number;
  room_id: number;
  seat_row: string;
  seat_number: number;
  seat_type: "NORMAL" | "VIP" | "COUPLE";
  price?: string | number | null;
  is_booked?: 0 | 1 | boolean;
};

export type ApiFood = {
  id: number;
  category_id: number;
  category_name: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

export type ApiFoodSize = {
  id: number;
  food_id: number;
  food_name: string;
  size_name: "S" | "M" | "L";
  price: string | number;
};

export type ApiBookingSummary = {
  id: number;
  booking_code: string;
  total_amount: string | number;
  booking_status: "PENDING" | "CONFIRMED" | "CANCELLED";
  showtime_id: number;
  movie_id?: number;
  start_time: string;
  end_time?: string;
  movie_title: string;
  poster_url: string | null;
};

export type ApiUser = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  birth_date: string | null;
  status: string;
  roles: string[];
};

export type ApiCinema = {
  id: number;
  name: string;
  brand: "CGV" | "LOTTE" | "GALAXY" | "BHD" | "CINESTAR";
  city: string;
  address: string;
  phone: string;
  logo_url: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  status: string;
  today_showtime_count?: number | string;
  showing_movie_count?: number | string;
  rooms?: ApiRoom[];
};

export type ApiRoom = {
  id: number;
  cinema_id: number;
  name: string;
  room_type: "2D" | "3D" | "IMAX" | "4DX";
  total_seats: number;
  status: "ACTIVE" | "MAINTENANCE";
};

export type ShowtimeByDate = {
  date: string;        // 'YYYY-MM-DD'
  day_label: string;   // 'T2 - 20/05'
  showtimes: ApiShowtime[];
};

// =====================================================
// VIP MEMBERSHIP TYPES
// =====================================================

export type ApiMembershipTier = {
  id: number;
  name: string;
  tier_level: number;
  min_spend: number;
  max_spend: number | null;
  discount_percent: number;
  point_multiplier: number;
  color_hex: string;
  icon_url: string | null;
  description: string | null;
  benefits: ApiMembershipBenefit[];
};

export type ApiMembershipBenefit = {
  id: number;
  tier_id?: number;
  benefit_key: string;
  label: string;
  value: string | null;
  used_this_month?: number;
};

export type ApiMembershipInfo = {
  user_id: number;
  tier: {
    id: number;
    name: string;
    level: number;
    discount_percent: number;
    point_multiplier: number;
    color_hex: string;
    icon_url: string | null;
    description: string | null;
  };
  total_spend: number;
  points: number;
  points_used: number;
  points_available: number;
  tier_updated_at: string;
  member_since: string;
  next_tier: {
    id: number;
    name: string;
    min_spend: number;
    discount_percent: number;
    spend_remaining: number;
    progress_percent: number;
  } | null;
  benefits: ApiMembershipBenefit[];
};

export type ApiTierHistory = {
  id: number;
  reason: "UPGRADE" | "DOWNGRADE" | "INIT";
  total_spend_at: number;
  changed_at: string;
  old_tier_name: string | null;
  old_color: string | null;
  new_tier_name: string;
  new_color: string;
};

export type ApiBenefitUsage = {
  id: number;
  benefit_key: string;
  used_at: string;
  booking_code: string | null;
};

export type ApiUserVoucher = {
  id: number;
  code: string;
  discount_amount: number;
  points_cost: number;
  status: "AVAILABLE" | "RESERVED" | "USED";
  created_at?: string;
};
