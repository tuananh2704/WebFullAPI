import type { ApiResponse } from "../types/api";
import apiClient from "./apiClient";

type CreatePaymentPayload = {
  booking_id: number;
  payment_method: "CASH" | "MOMO" | "VNPAY";
  amount?: number;
};

export const createPayment = async (payload: CreatePaymentPayload) => {
  const response = await apiClient.post<ApiResponse<unknown>>("/payments", payload);
  return response.data.data;
};
