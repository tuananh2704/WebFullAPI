import type { ApiMovie, ApiResponse, PaginatedMovies } from "../types/api";
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

export const getMovies = async (params: MovieSearchParams = {}): Promise<PaginatedMovies<ApiMovie>> => {
  const response = await apiClient.get<ApiResponse<PaginatedMovies<ApiMovie>>>("/movies", { params });
  return response.data.data;
};

export const getMovieById = async (id: number): Promise<ApiMovie> => {
  const response = await apiClient.get<ApiResponse<ApiMovie>>(`/movies/${id}`);
  return response.data.data;
};
