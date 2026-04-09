import request from './request'
import type { Booking, BookingQueryParams, BookingListResponse, ApiResponse } from '../types'

export const getBookings = (params: BookingQueryParams) =>
  request.get<never, BookingListResponse>('/bookings', { params })

export const getBookingById = (bookingId: string) =>
  request.get<never, ApiResponse<Booking>>(`/bookings/${bookingId}`)
