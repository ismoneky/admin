import { useRef, useState } from 'react'
import { Button, Empty, Alert } from 'antd'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { imagePoint } from './model'
import type { GuideDocument, Position } from './model'

interface Props {
  guide: GuideDocument
  selectedId: string | null
  picking: boolean
  disabled: boolean
  onPick: (position: Position) => void
  onSelect: (id: string) => void
  onMove: (id: string, position: Position) => void
}

export default function GuideCanvas({ guide, selectedId, picking, disabled, onPick, onSelect, onMove }: Props) {
  const imageRef = useRef<HTMLImageElement>(null)
  const drag = useRef<{ id: string; pointerId: number; dx: number; dy: number } | null>(null)
  const [loadedUrl, setLoadedUrl] = useState('')
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const ready = loadedUrl === guide.imageUrl && !failed
  const points = [...guide.points].sort((a, b) => a.sortOrder - b.sortOrder)
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = drag.current
    const image = imageRef.current
    if (!active || active.pointerId !== event.pointerId || !image || disabled) return
    const position = imagePoint(event.clientX - active.dx, event.clientY - active.dy, image.getBoundingClientRect())
    if (position) onMove(active.id, position)
  }
  if (!guide.imageUrl) return <div className="guide-canvas-empty"><Empty description="先上传或设置导览底图，再添加地点" /></div>
  return <div className="guide-canvas-scroll">
    {failed && <Alert type="error" showIcon title="底图加载失败" description="请检查图片链接或 CDN 访问权限。" action={<Button onClick={() => { setFailed(false); setAttempt(n => n + 1) }}>重试</Button>} />}
    <div className={`guide-canvas ${picking ? 'guide-canvas--picking' : ''}`} onClick={event => {
      if (disabled || !picking || !ready || !imageRef.current) return
      const position = imagePoint(event.clientX, event.clientY, imageRef.current.getBoundingClientRect())
      if (position) onPick(position)
    }}>
      <img key={`${guide.imageUrl}-${attempt}`} ref={imageRef} src={guide.imageUrl} alt="景区导览底图" draggable={false}
        onLoad={() => { setLoadedUrl(guide.imageUrl); setFailed(false) }} onError={() => setFailed(true)} />
      {ready && points.map((point, index) => <button
        key={point.id} type="button" aria-label={`标记 ${point.name || '未命名地点'}`} disabled={disabled}
        className={`guide-map-marker ${point.id === selectedId ? 'is-selected' : ''} ${!point.visible ? 'is-hidden' : ''}`}
        style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
        title={`${point.name || '未命名地点'}${point.visible ? '' : '（已隐藏）'}`}
        onClick={event => { event.stopPropagation(); onSelect(point.id) }}
        onPointerDown={event => {
          if (disabled || picking || !imageRef.current) return
          event.stopPropagation()
          onSelect(point.id)
          const rect = imageRef.current.getBoundingClientRect()
          drag.current = { id: point.id, pointerId: event.pointerId, dx: event.clientX - (rect.left + point.x * rect.width), dy: event.clientY - (rect.top + point.y * rect.height) }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={move}
        onPointerUp={event => { if (drag.current) { move(event); drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId) } }}
        onPointerCancel={() => { drag.current = null }}
        onKeyDown={event => {
          const step = event.shiftKey ? 0.01 : 0.001
          const offset: Record<string, Position> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } }
          if (!offset[event.key]) return
          event.preventDefault()
          onMove(point.id, { x: Math.max(0, Math.min(1, point.x + offset[event.key].x)), y: Math.max(0, Math.min(1, point.y + offset[event.key].y)) })
        }}
      >{index + 1}</button>)}
    </div>
  </div>
}
