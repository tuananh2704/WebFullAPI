export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ApiMovie = {
  id: number;
  title: string;
  description: string | null;
  duration: number | null;
  release_date: string | null;
  poster_url: string | null;
  language: string | null;
  rating: string | number | null;
  status: "COMING_SOON" | "NOW_SHOWING" | "ENDED";
  genres: string[];
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
  cinema_name: string;
  start_time: string;
  end_time: string;
  status: "OPEN" | "FULL" | "CANCELLED";
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
  start_time: string;
  movie_title: string;
  poster_url: string | null;
};

export type ApiUser = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  roles: string[];
};
