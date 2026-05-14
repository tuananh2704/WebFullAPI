import type { ApiResponse, ApiShowtime } from "../types/api";
import apiClient from "./apiClient";

export const getShowtimes = async (params: { movie_id?: number; status?: string } = {}) => {
  const response = await apiClient.get<ApiResponse<ApiShowtime[]>>("/showtimes", { params });
  return response.data.data;
};

export const getShowtimesByMovie = async (movieId: number) => {
  const response = await apiClient.get<ApiResponse<ApiShowtime[]>>(`/showtimes/movie/${movieId}`);
  return response.data.data;
};
