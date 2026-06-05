import type {
  ApiCanRateMovie,
  ApiMovie,
  ApiMovieRatings,
  ApiResponse,
  PaginatedMovies,
} from "../types/api";
import apiClient from "./apiClient";

export type MovieSearchParams = {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  status?: "NOW_SHOWING" | "COMING_SOON" | "ENDED";
  language?: string;
  director?: string;
  duration_min?: number;
  duration_max?: number;
  rating_min?: number;
  release_from?: string;
  release_to?: string;
  sort?: "rating_desc" | "release_desc" | "title_asc";
};

export interface TrailerSlide {
  id: number;
  title: string;
  trailer_url: string;
  poster_url: string;
  genre: string;
  release_date: string;
}

export const getMovies = async (params: MovieSearchParams = {}): Promise<PaginatedMovies<ApiMovie>> => {
  const response = await apiClient.get<ApiResponse<PaginatedMovies<ApiMovie>>>("/movies", { params });
  return response.data.data;
};

export const getMovieById = async (id: number): Promise<ApiMovie> => {
  const response = await apiClient.get<ApiResponse<ApiMovie>>(`/movies/${id}`);
  return response.data.data;
};

export const getMovieTrailers = async (): Promise<TrailerSlide[]> => {
  const response = await apiClient.get<ApiResponse<TrailerSlide[]>>("/movies/trailers");
  return response.data.data;
};

export const getMovieRatings = async (movieId: number): Promise<ApiMovieRatings> => {
  const response = await apiClient.get<ApiResponse<ApiMovieRatings>>(`/movies/${movieId}/ratings`);
  return response.data.data;
};

export const getCanRateMovie = async (movieId: number): Promise<ApiCanRateMovie> => {
  const response = await apiClient.get<ApiResponse<ApiCanRateMovie>>(`/movies/${movieId}/can-rate`);
  return response.data.data;
};

export const createMovieRating = async (
  movieId: number,
  payload: { bookingId: number; rating: number; comment: string }
): Promise<ApiMovieRatings> => {
  const response = await apiClient.post<ApiResponse<ApiMovieRatings>>(
    `/movies/${movieId}/ratings`,
    payload
  );
  return response.data.data;
};
