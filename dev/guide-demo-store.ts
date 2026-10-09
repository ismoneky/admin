import { randomUUID } from 'node:crypto'
import { isImageUrl, isDemoImageUrl, newGuidePoint, validateDraft } from '../src/pages/scenic-guide/model'
import type { GuideCategory, GuideDocument } from '../src/pages/scenic-guide/model'

export class DemoError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}

function seed(revision: number): GuideDocument {
  const examples: [string, number, number, number, number, GuideCategory[] , string][] = [
    ['风启之门', .779, .267, 35.77794175, 114.14446553, ['entrance', 'parking', 'toilet'], '景区入口 · 游客服务中心。可在这里咨询、停车和休整。'],
    ['观景驿站', .85, .38, 35.7708, 114.1321, ['station', 'parking', 'toilet'], '沿途观景休憩点。'],
    ['摩友驿站', .849, .571, 35.7621, 114.1184, ['station', 'spot'], '摩友咖啡屋 · 风车天路打卡点。'],
    ['天路风野营地', .541, .728, 35.7539, 114.0836, ['camp', 'parking', 'toilet'], '露营区 · 驿站休息。'],
    ['天路云顶驿站', .179, .741, 35.745443, 114.043167, ['station', 'parking', 'toilet'], '靠近西侧出口，可停车休息。'],
  ]
  return {
    title: '风车天路景区导览', imageUrl: '/__guide-demo/images/reference.jpg', imageWidth: 2412, imageHeight: 1280,
    revision, updatedAt: null,
    points: examples.map(([name, x, y, latitude, longitude, categories, description], index) => ({
      ...newGuidePoint(`demo-${index + 1}`, { x, y }, index), name, latitude, longitude, categories, description,
    })),
  }
}

/** Dev server memory only: no files, database, COS, or production requests. */
export function createGuideDemoStore() {
  let document = seed(1)
  const images = new Map<string, { bytes: Buffer; contentType: string }>()
  let imageBytes = 0
  return {
    read: () => structuredClone(document),
    save(draft: GuideDocument) {
      if (draft.revision !== document.revision) throw new DemoError('配置已更新，请重新加载后再保存', 409)
      const issue = validateDraft(draft, url => isImageUrl(url) || (isDemoImageUrl(url) && (url.endsWith('/reference.jpg') || images.has(url))))
      if (issue) throw new DemoError(issue.message)
      document = structuredClone({ ...draft, revision: document.revision + 1, updatedAt: Date.now() })
      return structuredClone(document)
    },
    reset() { document = seed(document.revision + 1); images.clear(); imageBytes = 0 },
    upload(bytes: Buffer, contentType: string) {
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[contentType]
      if (!extension || !bytes.length || bytes.length > 10 * 1024 * 1024) throw new DemoError('请选择不超过10 MB的 JPG、PNG 或 WebP 图片')
      if (imageBytes + bytes.length > 50 * 1024 * 1024) throw new DemoError('演示图片已达到50 MB，请恢复示例后继续体验')
      const url = `/__guide-demo/images/${randomUUID()}.${extension}`
      images.set(url, { bytes, contentType }); imageBytes += bytes.length
      return url
    },
    image: (url: string) => images.get(url),
  }
}
