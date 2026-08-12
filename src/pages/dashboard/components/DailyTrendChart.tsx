import { Card, Empty } from 'antd'
import { Line } from '@ant-design/charts'
import type { BookingDashboardDailyTrendItem } from '../../../types'

interface DailyTrendChartProps {
  dailyTrend: BookingDashboardDailyTrendItem[]
}

/**
 * 每日趋势折线图：至少展示预约人数与有效预约订单数
 * 数据为 long format：{ date, type, value }
 */
export default function DailyTrendChart({ dailyTrend }: DailyTrendChartProps) {
  const data = dailyTrend.flatMap((d) => [
    { date: d.date, type: '预约人数', value: d.peopleCount },
    { date: d.date, type: '有效预约订单数', value: d.validOrderCount },
  ])

  if (!dailyTrend.length) {
    return (
      <Card title="每日趋势" style={{ marginTop: 16 }}>
        <Empty />
      </Card>
    )
  }

  return (
    <Card title="每日趋势" style={{ marginTop: 16 }}>
      <Line
        data={data}
        xField="date"
        yField="value"
        colorField="type"
        smooth
        height={300}
        legend={{ color: { position: 'top' } }}
        axis={{
          x: { title: '预约日期' },
          y: { title: '数量' },
        }}
      />
    </Card>
  )
}
