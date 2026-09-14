import request from "./request";
import type {
  BookingQueryParams,
  BookingListResponse,
} from "../types";

export const getBookings = (params?: BookingQueryParams) =>
  request.get<never, BookingListResponse>("/admin/bookings", { params });

export const exportBookings = (params?: BookingQueryParams): Promise<Blob> =>
  request.get("/admin/bookings/export", { params, responseType: "blob" });
