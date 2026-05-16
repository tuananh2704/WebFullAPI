import type { ApiCinema, ApiResponse, ApiRoom, ApiShowtime, ShowtimeByDate } from "../types/api";
import apiClient from "./apiClient";

export const getCinemas = async (params?: { city?: string; brand?: string }): Promise<ApiCinema[]> => {
  const response = await apiClient.get<ApiResponse<ApiCinema[]>>("/cinemas", { params });
  return response.data.data;
};

export const getCinemaById = async (id: number): Promise<ApiCinema> => {
  const response = await apiClient.get<ApiResponse<ApiCinema>>(`/cinemas/${id}`);
  return response.data.data;
};

export const getRoomsByCinema = async (cinemaId: number): Promise<ApiRoom[]> => {
  const response = await apiClient.get<ApiResponse<ApiRoom[]>>(`/cinemas/${cinemaId}/rooms`);
  return response.data.data;
};

export const getShowtimesByCinema = async (
  cinemaId: number,
  params?: { movie_id?: number; date?: string; week?: number }
): Promise<ShowtimeByDate[]> => {
  const response = await apiClient.get<ApiResponse<ShowtimeByDate[]>>(
    `/cinemas/${cinemaId}/showtimes`,
    { params }
  );
  return response.data.data;
};

export const getShowtimesByMovieAndCinema = async (
  movieId: number,
  cinemaId: number,
  params?: { date?: string }
): Promise<ShowtimeByDate[]> => {
  // Reuse cinema showtimes endpoint with movie_id filter
  const response = await apiClient.get<ApiResponse<ShowtimeByDate[]>>(
    `/cinemas/${cinemaId}/showtimes`,
    { params: { movie_id: movieId, ...params } }
  );
  return response.data.data;
};
