import request from './request'
import type { ApiResponse, BookingDashboardResponse } from '../types'

export const getBookingDashboard = (params: { startDate: string; endDate: string }) =>
  request.get<never, ApiResponse<BookingDashboardResponse>>('/admin/bookings/dashboard', { params })
