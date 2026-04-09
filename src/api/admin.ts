import request from './request'
import type { ApiResponse } from '../types'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginData {
  token: string
  user: { id: string; username: string }
}

export const adminLogin = (params: LoginParams) =>
  request.post<never, ApiResponse<LoginData>>('/admin/login', params)
