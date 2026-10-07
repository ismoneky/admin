import { useState } from 'react'
import { Button, Input, Space, Upload, App } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { uploadGuideImage } from '../../api/scenicGuide'
import { loadImageSize } from './model'
import type { GuideImage } from './model'
import { GUIDE_DEMO, isEditorImageUrl } from './demo-mode'

interface Props { value: string; label: string; disabled: boolean; onChange: (image: GuideImage) => void; onBusy: (busy: boolean) => void; onClear?: () => void }
export default function ImageField({ value, label, disabled, onChange, onBusy, onClear }: Props) {
  const { message } = App.useApp()
  const [url, setUrl] = useState(value)
  const [loading, setLoading] = useState(false)
  const run = async (action: () => Promise<GuideImage>) => {
    setLoading(true); onBusy(true)
    try { const image = await action(); setUrl(image.imageUrl); onChange(image) }
    catch (error) { message.error(error instanceof Error ? error.message : '图片处理失败，请重试') }
    finally { setLoading(false); onBusy(false) }
  }
  return <div className="guide-image-field">
    <Space wrap>
      <Upload accept="image/jpeg,image/png,image/webp" showUploadList={false} disabled={disabled || loading} beforeUpload={file => { void run(() => uploadGuideImage(file)); return false }}>
        <Button icon={<UploadOutlined />} disabled={disabled} loading={loading}>上传{label}</Button>
      </Upload>
      {onClear && value && <Button type="text" disabled={disabled || loading} onClick={onClear}>移除配图</Button>}
    </Space>
    <div className="guide-image-field__url">
      <Input aria-label={`${label}图片链接`} value={url} disabled={disabled || loading} onChange={e => setUrl(e.target.value)} placeholder="或粘贴已有 HTTPS 图片链接" />
      <Button disabled={disabled || loading || !url.trim()} onClick={() => void run(async () => {
        const imageUrl = url.trim()
        if (!isEditorImageUrl(imageUrl)) throw new Error('请填写有效的 HTTPS 图片链接')
        return { imageUrl, ...await loadImageSize(imageUrl) }
      })}>使用链接</Button>
    </div>
    <span className="guide-muted">{GUIDE_DEMO ? '本地模拟选图，仅本次演示可见' : '图片直传腾讯云 COS'} · JPG / PNG / WebP · 最大 10 MB</span>
  </div>
}
