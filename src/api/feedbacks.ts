import request from './request'
import type { ApiResponse, Feedback } from '../types'

export const getFeedbacks = () =>
  request.get<never, ApiResponse<Feedback[]>>('/feedbacks')
