import type { ApiFood, ApiFoodSize, ApiResponse } from "../types/api";
import apiClient from "./apiClient";

export const getFoods = async () => {
  const response = await apiClient.get<ApiResponse<ApiFood[]>>("/foods");
  return response.data.data;
};

export const getFoodSizes = async (foodId?: number) => {
  const response = await apiClient.get<ApiResponse<ApiFoodSize[]>>("/foods/sizes", {
    params: foodId ? { food_id: foodId } : undefined,
  });
  return response.data.data;
};
