import type { ApiResponse, ApiUser } from "../types/api";
import apiClient from "./apiClient";

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
};

export const login = async (payload: LoginPayload) => {
  const response = await apiClient.post<ApiResponse<{ token: string; user: ApiUser }>>(
    "/auth/login",
    payload
  );

  localStorage.setItem("accessToken", response.data.data.token);
  return response.data.data;
};

export const register = async (payload: RegisterPayload) => {
  const response = await apiClient.post<ApiResponse<{ token: string; user: ApiUser }>>(
    "/auth/register",
    payload
  );

  localStorage.setItem("accessToken", response.data.data.token);
  return response.data.data;
};

export const getProfile = async () => {
  const response = await apiClient.get<ApiResponse<ApiUser>>("/auth/profile");
  return response.data.data;
};

export const logout = () => {
  localStorage.removeItem("accessToken");
};
