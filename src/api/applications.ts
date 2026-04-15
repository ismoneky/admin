import request from './request'
import type { ApiResponse, Application, ApplicationQueryParams } from '../types'

export const getApplications = (params?: ApplicationQueryParams) =>
  request.get<never, ApiResponse<Application[]>>('/admin/applications', { params })

export const approveApplication = (applicationId: string) =>
  request.post<never, ApiResponse<Application>>(`/admin/applications/${applicationId}/approve`)

export const rejectApplication = (applicationId: string, rejectionReason?: string) =>
  request.post<never, ApiResponse<Application>>(`/admin/applications/${applicationId}/reject`, {
    rejectionReason,
  })
