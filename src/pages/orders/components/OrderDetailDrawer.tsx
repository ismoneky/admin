import type { ReactNode } from 'react'
import { Drawer, Tag, Typography } from 'antd'
import {
  CalendarOutlined,
  CarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Booking, Passenger } from '../../../types'
import {
  BOOKING_STATUS_MAP,
  FREE_REASON_MAP,
  TIME_SLOT_MAP,
  TRAVEL_MODE_MAP,
  VEHICLE_TYPE_MAP,
} from '../../../constants/booking'
import {
  getAgeFreeStatusText,
  getPassengerTypeLabel,
  maskIdCardText,
  normalizePassengerForDisplay,
} from '../../../utils/passenger'
import './order-detail-drawer.css'

interface OrderDetailDrawerProps {
  open: boolean
  record: Booking | null
  onClose: () => void
}

interface OrderDetailContentProps {
  record: Booking
}

interface DetailSectionProps {
  title: string
  icon: ReactNode
  meta?: ReactNode
  children: ReactNode
}

interface DetailFieldProps {
  label: string
  value: ReactNode
  full?: boolean
}

const DRAWER_STYLES = {
  body: {
    padding: 0,
    background: '#f4f6f8',
  },
}

function parsePassengers(passengers: string | Passenger[] | undefined): Passenger[] {
  if (!passengers) return []
  if (Array.isArray(passengers)) return passengers
  try {
    const parsed: unknown = JSON.parse(passengers)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatDateTime(value: string | null | undefined): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—'
}

function formatAmount(record: Booking): string {
  if (record.isFree) return '¥0.00'
  return record.amount == null ? '—' : `¥${(record.amount / 100).toFixed(2)}`
}

function DetailSection({ title, icon, meta, children }: DetailSectionProps) {
  return (
    <section className="order-detail-section">
      <header className="order-detail-section__header">
        <div className="order-detail-section__heading">
          <span className="order-detail-section__icon">{icon}</span>
          <h3>{title}</h3>
        </div>
        {meta ? <div className="order-detail-section__meta">{meta}</div> : null}
      </header>
      {children}
    </section>
  )
}

function DetailField({ label, value, full = false }: DetailFieldProps) {
  return (
    <div className={`order-detail-field${full ? ' order-detail-field--full' : ''}`}>
      <span className="order-detail-field__label">{label}</span>
      <div className="order-detail-field__value">{value || '—'}</div>
    </div>
  )
}

function PassengerStatus({ passenger }: { passenger: ReturnType<typeof normalizePassengerForDisplay> }) {
  const ageFreeText = getAgeFreeStatusText(passenger)

  return (
    <div className="order-passenger-card__tags">
      {ageFreeText ? <Tag color="green">{ageFreeText}</Tag> : null}
      {passenger.idCardUnavailable ? (
        <Tag color="gold">未提供身份证号 · 按正常价格收费 · 暂时无法投保</Tag>
      ) : null}
      {!passenger.ageFree && !passenger.idCardUnavailable && !passenger.finalCharged ? (
        <Tag color="green">整单免费</Tag>
      ) : null}
      {!passenger.ageFree && !passenger.idCardUnavailable && passenger.finalCharged ? <Tag>正常收费</Tag> : null}
    </div>
  )
}

export function OrderDetailContent({ record }: OrderDetailContentProps) {
  const passengers = parsePassengers(record.passengers).map((passenger) =>
    normalizePassengerForDisplay(passenger, record),
  )
  let freePeopleCount = 0
  for (const passenger of passengers) {
    if (!passenger.finalCharged) freePeopleCount += 1
  }
  const chargedPeopleCount = passengers.length - freePeopleCount
  const status = BOOKING_STATUS_MAP[record.status]
  const freeReason = record.freeReason ? FREE_REASON_MAP[record.freeReason] : null
  const hasTravelDetails = Boolean(
    record.licensePlate || record.vehicleType || record.tourGroupName || record.tourOrderNumber,
  )

  return (
    <div className="order-detail-content">
      <section className="order-detail-summary">
        <div className="order-detail-summary__main">
          <span className="order-detail-summary__eyebrow">订单编号</span>
          <Typography.Text
            className="order-detail-summary__id"
            copyable={{ text: record.bookingId, tooltips: ['复制订单号', '已复制'] }}
          >
            {record.bookingId}
          </Typography.Text>
          <div className="order-detail-summary__tags">
            <Tag color={status.tagColor}>{status.label}</Tag>
            {record.isFree ? (
              <Tag color={freeReason?.color ?? 'green'}>{freeReason?.label ?? '免费预约'}</Tag>
            ) : (
              <Tag>收费订单</Tag>
            )}
          </div>
        </div>
        <div className="order-detail-summary__amount">
          <span>订单金额</span>
          <strong className={record.isFree ? 'is-free' : ''}>{formatAmount(record)}</strong>
          <small>{record.isFree ? '本单无需支付' : '实际应收金额'}</small>
        </div>
      </section>

      <DetailSection title="预约信息" icon={<CalendarOutlined />}>
        <div className="order-detail-grid">
          <DetailField label="预约日期" value={record.bookingDate} />
          <DetailField label="预约时段" value={TIME_SLOT_MAP[record.timeSlot]} />
          <DetailField label="出行方式" value={TRAVEL_MODE_MAP[record.travelMode]} />
          <DetailField label="预约人数" value={`${record.personCount} 人`} />
        </div>
      </DetailSection>

      <DetailSection title="联系人信息" icon={<UserOutlined />}>
        <div className="order-detail-grid">
          <DetailField label="联系人" value={record.name} />
          <DetailField label="手机号码" value={record.phone} />
          <DetailField label="身份证号" value={maskIdCardText(record.idCard)} />
          <DetailField
            label="微信 OpenID"
            value={(
              <Typography.Text copyable={{ text: record.wechatOpenId, tooltips: ['复制 OpenID', '已复制'] }}>
                {record.wechatOpenId}
              </Typography.Text>
            )}
          />
        </div>
      </DetailSection>

      {passengers.length > 0 ? (
        <DetailSection
          title="同行人员"
          icon={<TeamOutlined />}
          meta={`共 ${passengers.length} 人 · 免费 ${freePeopleCount} 人 · 收费 ${chargedPeopleCount} 人`}
        >
          <div className="order-passenger-grid">
            {passengers.map((passenger, index) => (
              <article className="order-passenger-card" key={`${passenger.name}-${passenger.idCard}-${index}`}>
                <header className="order-passenger-card__header">
                  <span className="order-passenger-card__index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="order-passenger-card__identity">
                    <strong>{passenger.name || '未填写姓名'}</strong>
                    <span>{getPassengerTypeLabel(passenger.passengerType, index)}</span>
                  </div>
                </header>
                <div className="order-passenger-card__details">
                  <div>
                    <span>手机号码</span>
                    <strong>{passenger.phone || '—'}</strong>
                  </div>
                  <div>
                    <span>身份证号</span>
                    <strong>{maskIdCardText(passenger.idCard)}</strong>
                  </div>
                </div>
                <PassengerStatus passenger={passenger} />
              </article>
            ))}
          </div>
        </DetailSection>
      ) : null}

      {hasTravelDetails ? (
        <DetailSection title="出行信息" icon={<CarOutlined />}>
          <div className="order-detail-grid">
            {record.vehicleType ? (
              <DetailField
                label="车辆类型"
                value={<Tag color={VEHICLE_TYPE_MAP[record.vehicleType].color}>{VEHICLE_TYPE_MAP[record.vehicleType].label}</Tag>}
              />
            ) : null}
            {record.licensePlate ? <DetailField label="车牌号" value={record.licensePlate} /> : null}
            {record.tourGroupName ? <DetailField label="旅游团名称" value={record.tourGroupName} /> : null}
            {record.tourOrderNumber ? <DetailField label="旅游团订单号" value={record.tourOrderNumber} /> : null}
          </div>
        </DetailSection>
      ) : null}

      <DetailSection title="订单记录" icon={<ClockCircleOutlined />}>
        <div className="order-detail-grid">
          <DetailField
            label="商户订单 ID"
            full
            value={(
              <Typography.Text copyable={{ text: record.outTradeNo, tooltips: ['复制商户订单号', '已复制'] }}>
                {record.outTradeNo}
              </Typography.Text>
            )}
          />
          <DetailField label="创建时间" value={formatDateTime(record.createdAt)} />
          <DetailField label="更新时间" value={formatDateTime(record.updatedAt)} />
          {record.expiredAt ? <DetailField label="过期时间" value={formatDateTime(record.expiredAt)} /> : null}
          <DetailField label="核销时间" value={formatDateTime(record.verifiedAt)} />
          <DetailField label="核销人员" value={record.verifiedByName || record.verifiedBy || '—'} />
          {record.remarks ? <DetailField label="订单备注" value={record.remarks} full /> : null}
        </div>
      </DetailSection>
    </div>
  )
}

export default function OrderDetailDrawer({ open, record, onClose }: OrderDetailDrawerProps) {
  return (
    <Drawer
      className="order-detail-drawer"
      title={(
        <div className="order-detail-drawer__title">
          <strong>订单详情</strong>
          <span>预约、人员与订单记录</span>
        </div>
      )}
      placement="right"
      width="min(820px, 100vw)"
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={DRAWER_STYLES}
    >
      {record ? <OrderDetailContent record={record} /> : null}
    </Drawer>
  )
}
