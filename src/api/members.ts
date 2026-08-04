import request from './request'
import type {
  Member,
  CreateMemberDto,
  UpdateMemberDto,
  MemberQueryParams,
  MemberListResponse,
  ApiResponse,
} from '../types'

export const getMembers = (params?: MemberQueryParams) =>
  request.get<never, MemberListResponse>('/admin/members', { params })

export const getMemberById = (memberId: string) =>
  request.get<never, ApiResponse<Member>>(`/admin/members/${memberId}`)

export const createMember = (data: CreateMemberDto) =>
  request.post<never, ApiResponse<Member>>('/admin/members', data)

export const updateMember = (memberId: string, data: UpdateMemberDto) =>
  request.put<never, ApiResponse<Member>>(`/admin/members/${memberId}`, data)

export const deleteMember = (memberId: string) =>
  request.delete<never, ApiResponse>(`/admin/members/${memberId}`)
