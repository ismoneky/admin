import request from './request'
import type { Booking, BookingQueryParams, BookingListResponse, ApiResponse } from '../types'

export const getBookings = (params: BookingQueryParams) =>
  request.get<never, BookingListResponse>('/admin/bookings', {
    params,
    paramsSerializer: (p) => {
      const search = new URLSearchParams()
      Object.entries(p).forEach(([key, val]) => {
        if (val === undefined || val === null) return
        if (Array.isArray(val)) {
          val.forEach((v) => search.append(key, v))
        } else {
          search.append(key, String(val))
        }
      })
      return search.toString()
    },
  })

export const getBookingById = (bookingId: string) =>
  request.get<never, ApiResponse<Booking>>(`/bookings/${bookingId}`)
