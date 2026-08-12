import { Card, Col, Row, Empty, Progress, Descriptions } from 'antd'
import type {
  BookingDashboardStatusItem,
  BookingDashboardTravelModeItem,
  BookingStatus,
  TravelMode,
} from '../../../types'

interface DistributionPanelsProps {
  statusDistribution: BookingDashboardStatusItem[]
  travelModeDistribution: BookingDashboardTravelModeItem[]
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: '待支付',
  confirmed: '已支付',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
}

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: '#fa8c16',
  confirmed: '#1677ff',
  completed: '#52c41a',
  cancelled: '#ff4d4f',
  refunded: '#722ed1',
}

const TRAVEL_MODE_LABEL: Record<TravelMode, string> = {
  scenicBus: '景区摆渡车',
  selfDriving: '自驾',
  tourGroup: '观光团',
}

/**
 * 订单状态分布（横向进度条）+ 出行方式分布（订单数与人数）
 */
export default function DistributionPanels({ statusDistribution, travelModeDistribution }: DistributionPanelsProps) {
  const maxStatus = Math.max(1, ...statusDistribution.map((d) => d.orderCount))
  const totalTravelOrders = travelModeDistribution.reduce((s, d) => s + d.orderCount, 0)

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} md={12}>
        <Card title="订单状态分布">
          {totalTravelOrders === 0 && statusDistribution.every((d) => d.orderCount === 0) ? (
            <Empty />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {statusDistribution.map((d) => (
                <div key={d.status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: STATUS_COLOR[d.status] }}>{STATUS_LABEL[d.status]}</span>
                    <span>{d.orderCount}</span>
                  </div>
                  <Progress
                    percent={Math.round((d.orderCount / maxStatus) * 100)}
                    strokeColor={STATUS_COLOR[d.status]}
                    showInfo={false}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="出行方式分布">
          {totalTravelOrders === 0 ? (
            <Empty />
          ) : (
            <Descriptions column={1} bordered size="small">
              {travelModeDistribution.map((d) => (
                <Descriptions.Item key={d.travelMode} label={TRAVEL_MODE_LABEL[d.travelMode]}>
                  订单 {d.orderCount} 单 / {d.peopleCount} 人
                </Descriptions.Item>
              ))}
            </Descriptions>
          )}
        </Card>
      </Col>
    </Row>
  )
}
