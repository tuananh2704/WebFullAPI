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
  localStorage.setItem("currentUser", JSON.stringify(response.data.data.user));
  return response.data.data;
};

export const register = async (payload: RegisterPayload) => {
  const response = await apiClient.post<ApiResponse<{ token: string; user: ApiUser }>>(
    "/auth/register",
    payload
  );

  localStorage.setItem("accessToken", response.data.data.token);
  localStorage.setItem("currentUser", JSON.stringify(response.data.data.user));
  return response.data.data;
};

export const getProfile = async () => {
  const response = await apiClient.get<ApiResponse<ApiUser>>("/auth/profile");
  return response.data.data;
};

export const logout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("currentUser");
};

export const getCurrentUser = (): ApiUser | null => {
  try {
    const data = localStorage.getItem("currentUser");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const isLoggedIn = (): boolean => {
  return Boolean(localStorage.getItem("accessToken"));
};
