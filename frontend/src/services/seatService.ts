import type { ApiResponse, ApiSeat } from "../types/api";
import apiClient from "./apiClient";

export const getSeatsByShowtime = async (showtimeId: number) => {
  const response = await apiClient.get<ApiResponse<ApiSeat[]>>(`/seats/showtime/${showtimeId}`);
  return response.data.data;
};

export const getSeatsByRoom = async (roomId: number) => {
  const response = await apiClient.get<ApiResponse<ApiSeat[]>>(`/seats/room/${roomId}`);
  return response.data.data;
};
