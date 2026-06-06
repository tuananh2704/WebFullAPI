import type { ApiResponse } from "../types/api";
import apiClient from "./apiClient";

export type UserNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  payload?: any;
  is_read: boolean | 0 | 1;
  created_at: string;
};

export const getNotifications = async () => {
  const response = await apiClient.get<ApiResponse<UserNotification[]>>("/notifications");
  return response.data.data;
};

export const markNotificationRead = async (id: number) => {
  const response = await apiClient.patch<ApiResponse<{ id: number; is_read: boolean }>>(
    `/notifications/${id}/read`
  );
  return response.data.data;
};

export const markAllNotificationsRead = async () => {
  const response = await apiClient.patch<ApiResponse<{ updated: boolean }>>(
    "/notifications/read-all"
  );
  return response.data.data;
};
