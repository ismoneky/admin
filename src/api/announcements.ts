import request from './request'
import type { Announcement, CreateAnnouncementDto, UpdateAnnouncementDto, ApiResponse } from '../types'

export const getAdminAnnouncements = () =>
  request.get<never, ApiResponse<Announcement[]>>('/announcements/admin/all')

export const createAnnouncement = (data: CreateAnnouncementDto) =>
  request.post<never, ApiResponse<Announcement>>('/announcements', data)

export const updateAnnouncement = (id: string, data: UpdateAnnouncementDto) =>
  request.put<never, ApiResponse<Announcement>>(`/announcements/${id}`, data)

export const deleteAnnouncement = (id: string) =>
  request.delete<never, ApiResponse>(`/announcements/${id}`)
