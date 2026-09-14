import request from './request'
import type { ApiResponse } from '../types'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginData {
  apiKey: string
  name: string
  username: string
  /**
   * 审核留痕用 token（12h 有效），与 apiKey 同时下发。
   *
   * 后端 x-admin-key 是长期密钥、只用于放行；x-admin-token 才带操作人身份，
   * 审核记录里的 adminId/adminName 来自它。缺失时后端只记 null，不拦截请求
   * （见 nest/src/common/guards/admin-jwt-auth.guard.ts）。
   */
  adminToken?: string
}

export const adminLogin = (params: LoginParams) =>
  request.post<never, ApiResponse<LoginData>>('/admin/login', params)
