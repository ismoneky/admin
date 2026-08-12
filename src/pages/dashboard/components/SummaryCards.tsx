import { Card, Col, Row, Statistic } from 'antd'
import { CarOutlined, TeamOutlined, DollarOutlined, FileTextOutlined } from '@ant-design/icons'
import type { BookingDashboardSummary } from '../../../types'
import { formatAmount, freePeopleRatio } from '../../../utils/format'

interface SummaryCardsProps {
  summary: BookingDashboardSummary
}

/**
 * 核心指标卡片 + 免费人数占比
 * 颜色语义：有效预约蓝 / 人数青 / 车辆紫 / 实收绿
 */
export default function SummaryCards({ summary }: SummaryCardsProps) {
  const ratio = freePeopleRatio(summary.freePeople, summary.totalPeople)
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="有效预约订单"
            value={summary.validOrderCount}
            prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
            valueStyle={{ color: '#1677ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="预约总人数"
            value={summary.totalPeople}
            prefix={<TeamOutlined style={{ color: '#13c2c2' }} />}
            valueStyle={{ color: '#13c2c2' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="自驾车辆数"
            value={summary.selfDrivingVehicleCount}
            prefix={<CarOutlined style={{ color: '#722ed1' }} />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="实收金额"
            value={formatAmount(summary.receivedAmount)}
            prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic title="免费预约人数" value={summary.freePeople} valueStyle={{ color: '#8c8c8c' }} />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic title="收费预约人数" value={summary.paidPeople} valueStyle={{ color: '#1677ff' }} />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic title="免费人数占比" value={ratio} suffix="%" valueStyle={{ color: '#faad14' }} />
        </Card>
      </Col>
    </Row>
  )
}
