import type { CSSProperties, ReactNode } from 'react'
import { Form } from 'antd'
import type { FormItemProps, FormProps } from 'antd'
import './query-filter-panel.css'

type QueryFilterPanelStyle = CSSProperties & {
  '--query-filter-columns'?: number
}

interface QueryFilterPanelProps extends Omit<FormProps, 'layout' | 'children'> {
  columns?: 1 | 2 | 3 | 4
  compact?: boolean
  ariaLabel?: string
  children?: ReactNode
}

interface QueryFilterItemProps extends FormItemProps {
  wide?: boolean
}

const joinClassNames = (...classNames: Array<string | undefined | false>) =>
  classNames.filter(Boolean).join(' ')

export function QueryFilterItem({ wide = false, className, ...props }: QueryFilterItemProps) {
  return (
    <Form.Item
      {...props}
      className={joinClassNames(
        'query-filter-panel__item',
        wide && 'query-filter-panel__item--wide',
        className,
      )}
    />
  )
}

export function QueryFilterActions({ className, ...props }: FormItemProps) {
  return (
    <Form.Item
      {...props}
      className={joinClassNames('query-filter-panel__actions', className)}
    />
  )
}

export default function QueryFilterPanel({
  columns = 3,
  compact = false,
  ariaLabel = '筛选条件',
  className,
  style,
  children,
  ...formProps
}: QueryFilterPanelProps) {
  const panelStyle: QueryFilterPanelStyle = {
    ...style,
    '--query-filter-columns': columns,
  }

  return (
    <Form
      {...formProps}
      layout="vertical"
      role="search"
      aria-label={ariaLabel}
      className={joinClassNames(
        'query-filter-panel',
        compact && 'query-filter-panel--compact',
        className,
      )}
      style={panelStyle}
    >
      {children}
    </Form>
  )
}
