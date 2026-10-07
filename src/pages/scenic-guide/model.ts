export const GUIDE_CATEGORIES = [
  { value: 'spot', label: '景点', color: '#357faf' },
  { value: 'station', label: '驿站', color: '#367c65' },
  { value: 'camp', label: '露营', color: '#9c6a35' },
  { value: 'parking', label: '停车场', color: '#596da8' },
  { value: 'toilet', label: '卫生间', color: '#967399' },
  { value: 'entrance', label: '出入口', color: '#b7614d' },
] as const

export type GuideCategory = typeof GUIDE_CATEGORIES[number]['value']
export interface GuidePoint {
  id: string
  name: string
  categories: GuideCategory[]
  description: string
  imageUrl: string
  x: number
  y: number
  visible: boolean
  sortOrder: number
  latitude?: number | null
  longitude?: number | null
  address: string
}
export interface GuideDocument {
  title: string
  imageUrl: string
  imageWidth: number
  imageHeight: number
  points: GuidePoint[]
  revision: number
  updatedAt: number | null
}
export interface GuideImage { imageUrl: string; width: number; height: number }
export interface Position { x: number; y: number }

export function imagePoint(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): Position | null {
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
  }
}

export function newGuidePoint(id: string, position: Position, sortOrder: number): GuidePoint {
  return { id, ...position, name: '', categories: ['spot'], description: '', imageUrl: '', visible: true, sortOrder, address: '' }
}

export const isDemoImageUrl = (url: string) => /^\/__guide-demo\/images\/(?:reference\.jpg|[a-f0-9-]{36}\.(?:jpg|png|webp))$/.test(url)

export function isImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password && value.length <= 2048
  } catch { return false }
}

export function validateDraft(doc: GuideDocument, imageValidator = isImageUrl): { message: string; pointId?: string } | null {
  if (!doc.title.trim() || doc.title.trim().length > 60) return { message: '请填写60字以内的导览标题' }
  if (!imageValidator(doc.imageUrl)) return { message: '请上传底图或填写有效的 HTTPS 图片链接' }
  if (![doc.imageWidth, doc.imageHeight].every(v => Number.isInteger(v) && v > 0 && v <= 20000)) return { message: '请重新加载底图，图片宽高须在20000像素以内' }
  if (doc.points.length > 100) return { message: '最多可设置100个地点' }
  const ids = new Set<string>()
  for (const p of doc.points) {
    const error = (message: string) => ({ message, pointId: p.id })
    if (ids.has(p.id)) return error('地点编号重复，请删除重复地点后重建')
    ids.add(p.id)
    if (!p.name.trim() || p.name.trim().length > 60) return error('请填写60字以内的地点名称')
    if (!p.categories.length || p.categories.some(c => !GUIDE_CATEGORIES.some(option => option.value === c))) return error(`${p.name}请选择地点分类`)
    if (![p.x, p.y].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) return error(`${p.name}请在图内重新选点`)
    if (!Number.isInteger(p.sortOrder) || p.sortOrder < 0 || p.sortOrder > 9999) return error(`${p.name}排序须为0到9999的整数`)
    if (p.imageUrl && !imageValidator(p.imageUrl)) return error(`${p.name}配图须使用 HTTPS 图片链接`)
    if (p.description.length > 500 || p.address.length > 200) return error(`${p.name}简介最多500字、地址最多200字`)
    const hasLat = p.latitude !== undefined && p.latitude !== null
    const hasLng = p.longitude !== undefined && p.longitude !== null
    if (hasLat !== hasLng) return error(`${p.name}经纬度须同时填写或同时留空`)
    if (hasLat && (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) || p.latitude! < -90 || p.latitude! > 90 || p.longitude! < -180 || p.longitude! > 180)) return error(`${p.name}经纬度范围不正确`)
  }
  if (new TextEncoder().encode(JSON.stringify(doc)).length > 180 * 1024) return { message: '导览内容过大，请缩短地点简介或图片链接' }
  return null
}

export function replaceGuideImage(doc: GuideDocument, image: GuideImage, clearPoints: boolean): GuideDocument {
  return { ...doc, imageUrl: image.imageUrl, imageWidth: image.width, imageHeight: image.height, points: clearPoints ? [] : doc.points }
}

export function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const timeout = window.setTimeout(() => { image.src = ''; reject(new Error('图片加载超时，请检查链接后重试')) }, 15000)
    image.onload = () => {
      clearTimeout(timeout)
      if (!image.naturalWidth || image.naturalWidth > 20000 || image.naturalHeight > 20000) reject(new Error('图片宽高须在20000像素以内'))
      else resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => { clearTimeout(timeout); reject(new Error('图片加载失败，请检查图片地址和访问权限')) }
    image.src = url
  })
}
