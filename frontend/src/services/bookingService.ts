import type { ApiBookingSummary, ApiResponse } from "../types/api";
import apiClient from "./apiClient";

type CreateBookingPayload = {
  showtime_id: number;
  seat_ids: number[];
  foods?: Array<{
    food_id: number;
    size_name: "S" | "M" | "L";
    quantity: number;
  }>;
};

export const createBooking = async (payload: CreateBookingPayload) => {
  const response = await apiClient.post<ApiResponse<any>>("/bookings", payload);
  return response.data.data;
};

export const getBookingHistory = async () => {
  const response = await apiClient.get<ApiResponse<ApiBookingSummary[]>>("/bookings/history");
  return response.data.data;
};

export const getBookingDetail = async (bookingId: number) => {
  const response = await apiClient.get<ApiResponse<any>>(`/bookings/${bookingId}`);
  return response.data.data;
};
