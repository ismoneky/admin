import request from "./request";
import type {
  BookingQueryParams,
  BookingListResponse,
} from "../types";

export const getBookings = (params?: BookingQueryParams) =>
  request.get<never, BookingListResponse>("/admin/bookings", { params });

export const exportBookings = (params?: BookingQueryParams): Promise<Blob> =>
  request.get("/admin/bookings/export", { params, responseType: "blob" });

export interface AdminCompletedRefundResponse {
  success: boolean
  message: string
  data: unknown
}

export const refundBookingAsAdmin = (
  bookingId: string,
  secondaryPassword: string,
): Promise<AdminCompletedRefundResponse> =>
  request.post(`/admin/bookings/${encodeURIComponent(bookingId)}/refund`, {
    secondaryPassword,
  })
