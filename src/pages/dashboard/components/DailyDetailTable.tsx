import { Card, Table, Empty } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { BookingDashboardDailyTrendItem } from '../../../types'
import { formatAmount } from '../../../utils/format'

interface DailyDetailTableProps {
  dailyTrend: BookingDashboardDailyTrendItem[]
}

/**
 * 每日明细表：与每日趋势图共享同一 dailyTrend 数组，作为图表的可核对数据源
 */
export default function DailyDetailTable({ dailyTrend }: DailyDetailTableProps) {
  const columns: ColumnsType<BookingDashboardDailyTrendItem> = [
    { title: '预约日期', dataIndex: 'date', key: 'date' },
    { title: '有效订单数', dataIndex: 'validOrderCount', key: 'validOrderCount' },
    { title: '预约人数', dataIndex: 'peopleCount', key: 'peopleCount' },
    { title: '自驾车辆数', dataIndex: 'selfDrivingVehicleCount', key: 'selfDrivingVehicleCount' },
    {
      title: '实收金额',
      dataIndex: 'receivedAmount',
      key: 'receivedAmount',
      render: (v: number) => formatAmount(v),
    },
  ]

  return (
    <Card title="每日明细" style={{ marginTop: 16 }}>
      {!dailyTrend.length ? (
        <Empty />
      ) : (
        <Table
          rowKey="date"
          columns={columns}
          dataSource={dailyTrend}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      )}
    </Card>
  )
}
