// 公告
export interface Announcement {
  id: string
  title: string
  content: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateAnnouncementDto {
  title: string
  content: string
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateAnnouncementDto {
  title?: string
  content?: string
  isActive?: boolean
  sortOrder?: number
}

// 系统配置
export interface TimeSlotLimit {
  morningMaxPeople: number
  afternoonMaxPeople: number
}

export interface PaymentConfig {
  paymentAmount: number
}

export interface Banner {
  imageUrl: string
  linkUrl?: string
}

export interface SystemConfig {
  id: string
  bookingEnabled: boolean
  bookingDisabledMessage: string
  banners: Banner[]
  timeSlotLimit: TimeSlotLimit
  paymentConfig: PaymentConfig
  createdAt: string
  updatedAt: string
}

export interface UpdateSystemConfigDto {
  bookingEnabled?: boolean
  bookingDisabledMessage?: string
  banners?: Banner[]
  timeSlotLimit?: TimeSlotLimit
  paymentConfig?: PaymentConfig
}

// 预约订单
export type TimeSlot = 'morning' | 'afternoon'
export type TravelMode = 'scenicBus' | 'selfDriving' | 'tourGroup'
export type VehicleType = 'smallCar' | 'mediumCar' | 'largeCar'
export type BookingStatus =
  | 'none'
  | 'pending_payment'
  | 'paying'
  | 'paid'
  | 'cancelled'
  | 'completed'
  | 'refunded'

export interface Booking {
  id: string
  wechatOpenId: string
  name: string
  phone: string
  idCard: string
  bookingDate: string
  timeSlot: TimeSlot
  travelMode: TravelMode
  licensePlate?: string
  vehicleType?: VehicleType
  tourGroupName?: string
  tourOrderNumber?: string
  personCount: number
  remarks?: string
  status: BookingStatus
  createdAt: string
  updatedAt: string
}

export interface BookingQueryParams {
  page?: number
  pageSize?: number
  wechatOpenId?: string
  bookingDate?: string
  timeSlot?: TimeSlot
  status?: BookingStatus
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface BookingListResponse {
  success: boolean
  data: Booking[]
  pagination: Pagination
}

// 通用响应
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: unknown
}
