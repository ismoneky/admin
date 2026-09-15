import request from './request'
import type { ApiResponse, ExpireScanResult, DailyReminderResult } from '../types'

/**
 * 手动触发定时任务（`POST /admin/tasks/*`）
 *
 * ── 为什么有这个入口 ──────────────────────────────────────────────────────
 * 两个扫描任务平时只能靠 cron 等到点执行（过期扫描每小时 :13，每日提醒每天 22:00），
 * 要验一次得掐着表等。这里让管理员立刻跑一次，方便测试和事故补扫。
 *
 * ── 它不是「后门」 ────────────────────────────────────────────────────────
 * 后端只是把 cron 调用的那个方法原样调一遍：静默期（下单不满 2 小时不推）、
 * 去重键、重入锁全部照旧生效。手动触发能改的是**时机**，以及——
 * 只有过期扫描这一条——**边界是否含当天**（见下）。
 *
 * ⚠️ **有真实副作用**：会改订单状态并给真实用户发站内信。二次确认放在页面里，
 * 不要在别处复用这两个函数而不加确认。
 */
/**
 * 覆盖本次扫描的静默期（分钟）。不传 = 后端 A 规则的默认 2 小时。
 *
 * `0` 是合法值 = 不设静默期。**cron 路径不受影响**，这个参数只作用于这一次手动触发。
 *
 * ── includeToday：过期边界是否含当天 ──────────────────────────────────────
 * 只有 `expire-scan` 认它。**不传 = 含当天**（后端的默认值就是「此刻之前」，
 * 这是它作为「清干净当前状态」入口的语义）。传 `false` 才退回 cron 的
 * 「严格早于今天」——当天的订单不动，留给用户当天核销。
 *
 * ⚠️ 含当天意味着当天未核销的订单**当场作废**（再也不能核销，只能走退款申请审核），
 * 且当天名额随之释放。页面上的勾选框与二次确认都在说这件事。
 */
const body = (quietWindowMinutes?: number, includeToday?: boolean) => {
  const payload: { quietWindowMinutes?: number; includeToday?: boolean } = {}
  if (quietWindowMinutes !== undefined) payload.quietWindowMinutes = quietWindowMinutes
  // 显式传 `false` 才有意义（把边界退回「严格早于今天」）；不传 = 后端默认含当天
  if (includeToday !== undefined) payload.includeToday = includeToday
  return payload
}

export const runExpireScan = (quietWindowMinutes?: number, includeToday?: boolean) =>
  request.post<never, ApiResponse<ExpireScanResult>>('/admin/tasks/expire-scan', body(quietWindowMinutes, includeToday))

export const runDailyReminder = (quietWindowMinutes?: number) =>
  request.post<never, ApiResponse<DailyReminderResult>>('/admin/tasks/daily-reminder', body(quietWindowMinutes))
