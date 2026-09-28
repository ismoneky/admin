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

function blockSizeWithMargins(element: HTMLElement | null) {
  if (!element) return 0

  const style = window.getComputedStyle(element)
  const marginTop = Number.parseFloat(style.marginTop) || 0
  const marginBottom = Number.parseFloat(style.marginBottom) || 0

  return element.getBoundingClientRect().height + marginTop + marginBottom
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

    if (!host || !viewport) return

    const viewportRect = viewport.getBoundingClientRect()
    const viewportStyle = window.getComputedStyle(viewport)
    const viewportPaddingBottom = Number.parseFloat(viewportStyle.paddingBottom) || 0
    const hostTop = host.getBoundingClientRect().top
    const header = host.querySelector<HTMLElement>('.ant-table-header')
    const pagination = host.querySelector<HTMLElement>('.ant-table-pagination')
    const availableTableHeight = viewportRect.bottom - viewportPaddingBottom - hostTop
    const chromeHeight = blockSizeWithMargins(header) + blockSizeWithMargins(pagination)
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
