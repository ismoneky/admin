/**
 * 金额格式化：分 → 元，显示为 ¥1,260.00
 * 接口金额单位为分，仅在管理后台展示时转换为元。
 */
export function formatAmount(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(Number(cents))) return '¥0.00'
  const yuan = Number(cents) / 100
  return `¥${yuan.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * 免费人数占比：totalPeople 为 0 时返回 0，否则 freePeople / totalPeople * 100，保留一位小数
 */
export function freePeopleRatio(freePeople: number, totalPeople: number): number {
  if (!totalPeople || totalPeople === 0) return 0
  const r = (freePeople / totalPeople) * 100
  return Math.round(r * 10) / 10
}
