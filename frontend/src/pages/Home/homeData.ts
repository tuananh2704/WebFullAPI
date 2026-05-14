export type Movie = {
  id?: number;
  title: string;
  rating: string;
  age: string;
  duration: string;
  genres: string[];
  image: string;
  description?: string;
  format?: string;
  featured?: boolean;
};

export type Deal = {
  title: string;
  description: string;
  discount: string;
  variant: "tuesday" | "vip";
};

export const posterFallbacks = [
  "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=85",
];

export const heroMovie: Movie = {
  title: "Dune",
  rating: "8.8",
  age: "T13",
  duration: "166 phút",
  genres: ["Sci-Fi", "Adventure"],
  image:
    "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1900&q=88",
  format: "Phụ đề",
  description:
    "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
};

export const fallbackMovies: Movie[] = [
  {
    title: "Dune: Part Two",
    rating: "8.8",
    age: "T13",
    duration: "166min",
    genres: ["Sci-Fi", "Adventure"],
    image: posterFallbacks[0],
  },
  {
    title: "Oppenheimer",
    rating: "8.5",
    age: "T16",
    duration: "180min",
    genres: ["Biography", "Drama"],
    image: posterFallbacks[1],
  },
  {
    title: "The Batman",
    rating: "7.9",
    age: "T13",
    duration: "176min",
    genres: ["Action", "Crime"],
    image: posterFallbacks[2],
    featured: true,
  },
];

export const deals: Deal[] = [
  {
    title: "Thứ 3 vui vẻ",
    description: "Giảm 50% cho tất cả suất chiếu vào thứ 3",
    discount: "-50%",
    variant: "tuesday",
  },
  {
    title: "Member VIP",
    description: "Ưu đãi đặc biệt cho thành viên VIP",
    discount: "-30%",
    variant: "vip",
  },
];
