import type {
  ApiMembershipInfo,
  ApiMembershipTier,
  ApiResponse,
  ApiTierHistory,
  ApiBenefitUsage,
  ApiUserVoucher,
} from "../types/api";
import apiClient from "./apiClient";

export const getMyMembership = async () => {
  const response = await apiClient.get<ApiResponse<ApiMembershipInfo>>("/membership/me");
  return response.data.data;
};

export const getAllTiers = async () => {
  const response = await apiClient.get<ApiResponse<ApiMembershipTier[]>>("/membership/tiers");
  return response.data.data;
};

export const getTierHistory = async () => {
  const response = await apiClient.get<ApiResponse<ApiTierHistory[]>>("/membership/history");
  return response.data.data;
};

export const getBenefitUsage = async () => {
  const response = await apiClient.get<ApiResponse<ApiBenefitUsage[]>>("/membership/benefits/usage");
  return response.data.data;
};

export const getMyVouchers = async () => {
  const response = await apiClient.get<ApiResponse<ApiUserVoucher[]>>("/membership/vouchers");
  return response.data.data;
};

export const exchangeVoucher = async (discountAmount: number) => {
  const response = await apiClient.post<ApiResponse<ApiUserVoucher>>("/membership/vouchers/exchange", {
    discount_amount: discountAmount,
  });
  return response.data.data;
};
