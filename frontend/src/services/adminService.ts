import type { ApiMovie, ApiResponse } from "../types/api";
import apiClient from "./apiClient";

export const getDashboardStats = async () => {
  const response = await apiClient.get<ApiResponse<any>>("/admin/dashboard");
  return response.data.data;
};

export const createAdminMovie = async (payload: Partial<ApiMovie>) => {
  const response = await apiClient.post<ApiResponse<ApiMovie>>("/admin/movies", payload);
  return response.data.data;
};

export const updateAdminMovie = async (id: number, payload: Partial<ApiMovie>) => {
  const response = await apiClient.put<ApiResponse<ApiMovie>>(`/admin/movies/${id}`, payload);
  return response.data.data;
};

export const deleteAdminMovie = async (id: number) => {
  const response = await apiClient.delete<ApiResponse<{}>>(`/admin/movies/${id}`);
  return response.data;
};

export const createAdminShowtime = async (payload: any) => {
  const response = await apiClient.post<ApiResponse<any>>("/admin/showtimes", payload);
  return response.data.data;
};

export const updateAdminShowtime = async (id: number, payload: any) => {
  const response = await apiClient.put<ApiResponse<any>>(`/admin/showtimes/${id}`, payload);
  return response.data.data;
};

export const deleteAdminShowtime = async (id: number) => {
  const response = await apiClient.delete<ApiResponse<{}>>(`/admin/showtimes/${id}`);
  return response.data;
};
