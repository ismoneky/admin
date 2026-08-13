import type { Booking, Passenger, PassengerPricingReason, PassengerType } from '../types'

/**
 * 订单人员快照归一化（严格按实施计划 2.2 的旧订单默认值）。
 * 新快照字段透传；旧订单缺字段时按 booking.isFree / freeReason 推导。
 * 历史订单只展示后端保存的计费快照，绝不按当前年份重新计算年龄。
 */
export interface PassengerDisplay {
  name: string
  phone: string
  idCard: string
  idCardText: string
  passengerType: PassengerType
  idCardUnavailable: boolean
  ageValue: number | null
  ageFree: boolean
  finalCharged: boolean
  pricingReason: PassengerPricingReason | null
}

export function normalizePassengerForDisplay(
  passenger: Passenger | null | undefined,
  booking?: Pick<Booking, 'isFree' | 'freeReason'> | null,
): PassengerDisplay {
  const p = passenger ?? ({} as Partial<Passenger>)
  const b = booking ?? {}
  const idCard = typeof p.idCard === 'string' ? p.idCard : ''
  return {
    name: typeof p.name === 'string' ? p.name : '',
    phone: typeof p.phone === 'string' ? p.phone : '',
    idCard,
    // 空身份证显示「未提供」，不显示空字符串
    idCardText: idCard || '未提供',
    passengerType: p.passengerType === 'child' || p.passengerType === 'senior' ? p.passengerType : 'adult',
    idCardUnavailable: p.idCardUnavailable === true,
    ageValue: typeof p.ageValue === 'number' ? p.ageValue : null,
    ageFree: p.ageFree === true,
    finalCharged: typeof p.finalCharged === 'boolean' ? p.finalCharged : !(b.isFree === true),
    pricingReason:
      typeof p.pricingReason === 'string' && p.pricingReason
        ? p.pricingReason
        : b.freeReason === 'member'
          ? 'member_order_free'
          : b.freeReason === 'dailyQuota'
            ? 'daily_quota_order_free'
            : 'regular',
  }
}

/** 人员类型展示标签：0 号为联系人，其余按类型区分 */
export function getPassengerTypeLabel(passengerType: PassengerType | undefined, index: number): string {
  if (index === 0) return '联系人'
  if (passengerType === 'child') return '同行儿童'
  if (passengerType === 'senior') return '同行老人'
  return '普通同行人'
}

/** 身份证展示文本：有值掩码（前4后4），空值显示「未提供」 */
export function maskIdCardText(idCard: string | null | undefined): string {
  const card = idCard == null ? '' : String(idCard)
  if (!card) return '未提供'
  if (card.length < 8) return card
  return `${card.substring(0, 4)}**********${card.substring(card.length - 4)}`
}

/** 年龄免费状态文案（仅 child/senior 且 ageFree 为 true 时有值） */
export function getAgeFreeStatusText(p: PassengerDisplay): string {
  if (p.ageFree !== true) return ''
  if (p.passengerType === 'child') return '7岁及以下，年龄免费'
  if (p.passengerType === 'senior') return '70岁及以上，年龄免费'
  return ''
}
