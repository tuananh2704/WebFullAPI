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
  birth_date: string;
  password: string;
};

type RegisterOtpResponse = {
  email: string;
  expires_in_seconds: number;
};

type VerifyRegisterPayload = {
  email: string;
  verification_code: string;
};

type PasswordChangeRequestPayload = {
  new_password: string;
};

type PasswordChangeVerifyPayload = {
  verification_code: string;
};

type ForgotPasswordRequestPayload = {
  email: string;
};

type ForgotPasswordVerifyPayload = {
  email: string;
  verification_code: string;
};

type ForgotPasswordResetPayload = {
  email: string;
  verification_code: string;
  new_password: string;
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
  const response = await apiClient.post<ApiResponse<RegisterOtpResponse>>(
    "/auth/register",
    payload
  );

  return response.data.data;
};

export const verifyRegister = async (payload: VerifyRegisterPayload) => {
  const response = await apiClient.post<ApiResponse<{ token: string; user: ApiUser }>>(
    "/auth/verify-register",
    payload
  );

  localStorage.setItem("accessToken", response.data.data.token);
  localStorage.setItem("currentUser", JSON.stringify(response.data.data.user));
  return response.data.data;
};

export const getProfile = async () => {
  const response = await apiClient.get<ApiResponse<ApiUser>>("/auth/profile");
  localStorage.setItem("currentUser", JSON.stringify(response.data.data));
  return response.data.data;
};

export const requestPasswordChange = async (payload: PasswordChangeRequestPayload) => {
  const response = await apiClient.post<ApiResponse<RegisterOtpResponse>>(
    "/auth/password-change/request",
    payload
  );

  return response.data.data;
};

export const verifyPasswordChange = async (payload: PasswordChangeVerifyPayload) => {
  const response = await apiClient.post<ApiResponse<{ changed: boolean }>>(
    "/auth/password-change/verify",
    payload
  );

  return response.data.data;
};

export const requestForgotPassword = async (payload: ForgotPasswordRequestPayload) => {
  const response = await apiClient.post<ApiResponse<RegisterOtpResponse>>(
    "/auth/forgot-password/request",
    payload
  );

  return response.data.data;
};

export const verifyForgotPasswordCode = async (payload: ForgotPasswordVerifyPayload) => {
  const response = await apiClient.post<ApiResponse<{ verified: boolean }>>(
    "/auth/forgot-password/verify-code",
    payload
  );

  return response.data.data;
};

export const resetForgotPassword = async (payload: ForgotPasswordResetPayload) => {
  const response = await apiClient.post<ApiResponse<{ changed: boolean }>>(
    "/auth/forgot-password/reset",
    payload
  );

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

export const hasAdminAccess = (user: ApiUser | null): boolean => {
  return Boolean(user?.roles?.some((role) => role === "ADMIN" || role === "EMPLOYEE"));
};

export const isLoggedIn = (): boolean => {
  return Boolean(localStorage.getItem("accessToken"));
};
