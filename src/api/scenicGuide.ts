import request from './request'
import type { ApiResponse } from '../types'
import type { GuideDocument, GuideImage } from '../pages/scenic-guide/model'
import { loadImageSize } from '../pages/scenic-guide/model'
import { GUIDE_DEMO } from '../pages/scenic-guide/demo-mode'

interface UploadPolicy { uploadUrl: string; imageUrl: string; expiresAt: number; fields: Record<string, string> }
export const getScenicGuide = () => request.get<never, ApiResponse<GuideDocument>>('/scenic-guide/admin')
export const saveScenicGuide = (data: GuideDocument) => request.put<never, ApiResponse<GuideDocument>>('/scenic-guide/admin', data)

export async function uploadGuideImage(file: File): Promise<GuideImage> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error('请选择不超过10 MB的 JPG、PNG 或 WebP 图片')
  const preview = URL.createObjectURL(file)
  let size
  try { size = await loadImageSize(preview) } finally { URL.revokeObjectURL(preview) }
  if (GUIDE_DEMO) {
    const uploaded = await fetch('/__guide-demo/upload', { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
    const result = await uploaded.json()
    if (!uploaded.ok) throw new Error(result.message || '演示图片选择失败')
    return { imageUrl: result.imageUrl, ...size }
  }
  const response = await request.post<never, ApiResponse<UploadPolicy>>('/scenic-guide/upload-policy', { contentType: file.type, size: file.size })
  if (!response.success || !response.data) throw new Error('获取上传凭证失败')
  const { uploadUrl, fields, imageUrl } = response.data
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => form.append(key, value))
  form.append('file', file) // COS requires the file field last.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90000)
  try {
    // A separate fetch deliberately omits the admin API key and cookies when talking to COS.
    const uploaded = await fetch(uploadUrl, { method: 'POST', body: form, credentials: 'omit', signal: controller.signal })
    if (!uploaded.ok) throw new Error(`腾讯云上传失败（${uploaded.status}），请检查存储桶权限和上传配置`)
  } catch (error) {
    if (error instanceof TypeError) throw new Error('无法连接腾讯云，请检查网络及存储桶 CORS 配置')
    throw error
  } finally { clearTimeout(timer) }
  return { imageUrl, ...size }
}
