export type Movie = {
  id?: number;
  title: string;
  status?: "NOW_SHOWING" | "COMING_SOON" | "ENDED";
  rating: string;
  age: string;
  duration: string;
  genres: string[];
  image: string;
  description?: string;
  format?: string;
  featured?: boolean;
  bookingCount?: number;
};

export type Deal = {
  title: string;
  description: string;
  discount: string;
  variant: "tuesday" | "vip";
  actionLabel: string;
  actionHref: string;
};

// Poster phim thật từ TMDB CDN (portrait 2:3 ratio)
export const posterFallbacks = [
  // Spider-Man: No Way Home
  "https://image.tmdb.org/t/p/w500/uJYYizSuA9Y3DCs0qS4qWvHfZg4.jpg",
  // Frozen II
  "https://image.tmdb.org/t/p/w500/qdfARIhgpgZOBh3vfNhWS4hmSo3.jpg",
  // Avengers: Endgame
  "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
  // The Batman
  "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
  // Dune
  "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
  // Top Gun: Maverick
  "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
];

export const heroMovie: Movie = {
  title: "Spider-Man: No Way Home",
  rating: "8.7",
  age: "T13",
  duration: "148 phút",
  genres: ["Action", "Adventure", "Sci-Fi"],
  image: posterFallbacks[0],
  format: "English",
  description:
    "Peter Parker nhờ Doctor Strange giúp xóa danh tính Spider-Man, nhưng phép thuật bị gián đoạn khiến những kẻ phản diện từ các vũ trụ song song xuất hiện.",
};

export const fallbackMovies: Movie[] = [
  {
    title: "Spider-Man: No Way Home",
    rating: "8.7",
    age: "T13",
    duration: "148min",
    genres: ["Action", "Adventure"],
    image: posterFallbacks[0],
    description:
      "Peter Parker nhờ Doctor Strange giúp xóa danh tính Spider-Man, nhưng phép thuật bị gián đoạn.",
    format: "English",
  },
  {
    title: "Frozen II",
    rating: "6.8",
    age: "P",
    duration: "103min",
    genres: ["Animation", "Adventure"],
    image: posterFallbacks[1],
    description:
      "Elsa và Anna lên đường đến một khu rừng huyền bí để tìm hiểu nguồn gốc sức mạnh của Elsa.",
    format: "Phụ đề",
  },
  {
    title: "Avengers: Endgame",
    rating: "8.4",
    age: "T13",
    duration: "181min",
    genres: ["Action", "Sci-Fi"],
    image: posterFallbacks[2],
    description:
      "Sau thảm họa của Thanos, các Avengers tập hợp lần cuối trong một sứ mệnh không thể thất bại.",
    format: "English",
    featured: true,
  },
  {
    title: "The Batman",
    rating: "7.8",
    age: "T16",
    duration: "176min",
    genres: ["Action", "Crime"],
    image: posterFallbacks[3],
    description:
      "Batman đối mặt với Riddler, kẻ thách thức Gotham bằng một chuỗi tội ác được lên kế hoạch tỉ mỉ.",
    format: "Phụ đề",
  },
  {
    title: "Dune",
    rating: "7.9",
    age: "T13",
    duration: "155min",
    genres: ["Sci-Fi", "Adventure"],
    image: posterFallbacks[4],
    description:
      "Paul Atreides dẫn dắt gia tộc tới hành tinh sa mạc Arrakis, nơi nắm giữ tài nguyên quý giá nhất vũ trụ.",
    format: "Phụ đề",
  },
  {
    title: "Top Gun: Maverick",
    rating: "8.3",
    age: "T13",
    duration: "130min",
    genres: ["Action", "Drama"],
    image: posterFallbacks[5],
    description:
      "Maverick trở lại huấn luyện thế hệ phi công mới cho một nhiệm vụ đặc biệt đầy nguy hiểm.",
    format: "English",
  },
];

export const deals: Deal[] = [
  {
    title: "Thứ 3 vui vẻ",
    description: "Giảm 50% cho tất cả suất chiếu vào thứ 3",
    discount: "-50%",
    variant: "tuesday",
    actionLabel: "Đặt vé thứ 3",
    actionHref: "#booking",
  },
  {
    title: "Member VIP",
    description: "Ưu đãi đặc biệt cho thành viên VIP",
    discount: "-30%",
    variant: "vip",
    actionLabel: "Xem VIP",
    actionHref: "/membership",
  },
];
