import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Table } from 'antd'
import type { TableProps } from 'antd'
import './auto-height-table.css'

const DEFAULT_MIN_BODY_HEIGHT = 200

type AutoHeightTableStyle = CSSProperties & {
  '--auto-height-table-body-height': string
}

export interface AutoHeightTableProps<RecordType extends object>
  extends TableProps<RecordType> {
  minBodyHeight?: number
}

export default function AutoHeightTable<RecordType extends object>({
  minBodyHeight = DEFAULT_MIN_BODY_HEIGHT,
  scroll,
  ...tableProps
}: AutoHeightTableProps<RecordType>) {
  const hostRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const [bodyHeight, setBodyHeight] = useState(minBodyHeight)

  const measure = useCallback(() => {
    const host = hostRef.current
    const viewport = host?.closest<HTMLElement>('.main-layout__content-body')
    const body = host?.querySelector<HTMLElement>('.ant-table-body')

    if (!host || !viewport || !body) return

    const viewportRect = viewport.getBoundingClientRect()
    const viewportStyle = window.getComputedStyle(viewport)
    const viewportPaddingBottom = Number.parseFloat(viewportStyle.paddingBottom) || 0
    let wrapperBottomSpace = 0
    for (let parent = host.parentElement; parent && parent !== viewport; parent = parent.parentElement) {
      const style = window.getComputedStyle(parent)
      wrapperBottomSpace += (Number.parseFloat(style.paddingBottom) || 0)
        + (Number.parseFloat(style.borderBottomWidth) || 0)
        + (Number.parseFloat(style.marginBottom) || 0)
    }
    const hostRect = host.getBoundingClientRect()
    const hostTop = hostRect.top + viewport.scrollTop
    const availableTableHeight = viewportRect.bottom - viewportPaddingBottom - wrapperBottomSpace - hostTop
    // Include borders, header and pagination spacing in the measured table height.
    const chromeHeight = hostRect.height - body.getBoundingClientRect().height
    const nextBodyHeight = Math.max(
      minBodyHeight,
      Math.floor(availableTableHeight - chromeHeight),
    )

    setBodyHeight((current) => (current === nextBodyHeight ? current : nextBodyHeight))
  }, [minBodyHeight])

  const scheduleMeasure = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      measure()
    })
  }, [measure])

  useLayoutEffect(() => {
    const host = hostRef.current
    const viewport = host?.closest<HTMLElement>('.main-layout__content-body')

    if (!host || !viewport) return

    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(viewport)
    observer.observe(host)
    window.addEventListener('resize', scheduleMeasure)
    scheduleMeasure()

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [scheduleMeasure])

  useLayoutEffect(() => {
    scheduleMeasure()
  })

  const style: AutoHeightTableStyle = {
    '--auto-height-table-body-height': `${bodyHeight}px`,
  }

  return (
    <div ref={hostRef} className="auto-height-table" style={style}>
      <Table<RecordType>
        {...tableProps}
        scroll={{ ...scroll, y: bodyHeight }}
      />
    </div>
  )
}
