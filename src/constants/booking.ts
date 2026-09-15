import type { BookingStatus, FreeReason, TimeSlot, TravelMode, VehicleType } from '../types'

export const TIME_SLOT_MAP: Record<TimeSlot, string> = {
  morning: '上午',
  afternoon: '下午',
}

export const FREE_REASON_MAP: Record<Exclude<FreeReason, null>, { label: string; color: string }> = {
  member: { label: '会员免费', color: 'gold' },
  dailyQuota: { label: '每日免费', color: 'cyan' },
  age: { label: '年龄免费', color: 'green' },
}

export const TRAVEL_MODE_MAP: Record<TravelMode, string> = {
  scenicBus: '景区大巴',
  selfDriving: '自驾',
  tourGroup: '旅游团',
}

export const VEHICLE_TYPE_MAP: Record<VehicleType, { label: string; color: string }> = {
  wheelMotorcycle: { label: '摩托车', color: 'volcano' },
  smallCar: { label: '小客车', color: 'geekblue' },
}

/**
 * 订单状态（bookings.status）中文映射 —— 全站唯一来源。
 *
 * 口径：status 描述的是「预约本身的生命周期」，不描述钱。
 * 金额由 paymentStatus 单独表达（列表中与 status 并列展示），
 * 所以这里不能用「已支付」这类金额措辞，否则与隔壁的支付状态列重复且互相打架。
 *
 * 与小程序端保持一致：fctl `pages/booking/booking.vue` 的 tab 即
 * 「待支付 / 待使用 / 已完成」，本表是同一套词。
 *
 * 注意：类型是 Record<BookingStatus, ...> 而不是宽松的 Record<string, ...>。
 * 后端新增状态（如 expired）时，TypeScript 会在此处直接报错，
 * 强制先补齐文案再编译通过 —— 这正是收敛成单一来源的目的。
 */
export const BOOKING_STATUS_MAP: Record<
  BookingStatus,
  {
    /** 中文文案 */
    label: string
    /** antd Tag 的预设色名（浅底 + 彩字 + 描边） */
    tagColor: string
    /** 进度条/图表的描边色（实色）。与 tagColor 是两套渲染体系，故意并存 */
    barColor: string
  }
> = {
  pending: { label: '待支付', tagColor: 'orange', barColor: '#fa8c16' },
  confirmed: { label: '待使用', tagColor: 'blue', barColor: '#1677ff' },
  completed: { label: '已完成', tagColor: 'green', barColor: '#52c41a' },
  cancelled: { label: '已取消', tagColor: 'red', barColor: '#ff4d4f' },
  refunded: { label: '已退款', tagColor: 'purple', barColor: '#722ed1' },
  // 已过期：中性灰。**刻意不用红色**——红色留给「已取消」，而 expired 是仍可申请退款的状态，
  // 让用户误当成「已取消」就不会去申请了。同理不用橙色（与「待支付」撞色）。
  expired: { label: '已过期', tagColor: 'default', barColor: '#8c8c8c' },
}
