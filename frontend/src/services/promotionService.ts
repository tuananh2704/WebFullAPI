import type { ApiResponse } from "../types/api";
import apiClient from "./apiClient";

export const applyPromotion = async (payload: { code: string; total_amount: number }) => {
  const response = await apiClient.post<ApiResponse<unknown>>("/promotions/apply", payload);
  return response.data.data;
};
