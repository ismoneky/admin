import request from './request'
import type { SystemConfig, UpdateSystemConfigDto, ApiResponse } from '../types'

export const getSystemConfig = () =>
  request.get<never, ApiResponse<SystemConfig>>('/system-config')

export const updateSystemConfig = (data: UpdateSystemConfigDto) =>
  request.put<never, ApiResponse<SystemConfig>>('/system-config', data)
