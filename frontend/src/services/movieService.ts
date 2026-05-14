import type { ApiMovie, ApiResponse, PaginatedMovies } from "../types/api";
import apiClient from "./apiClient";

type GetMoviesParams = {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  status?: string;
};

export const getMovies = async (params: GetMoviesParams = {}) => {
  const response = await apiClient.get<ApiResponse<PaginatedMovies<ApiMovie>>>(
    "/movies",
    { params }
  );

  return response.data.data;
};
