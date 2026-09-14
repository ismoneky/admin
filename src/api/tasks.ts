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
 * 去重键、单轮 200 条上限、重入锁全部照旧生效。手动触发能改的只是**时机**。
 *
 * ⚠️ **有真实副作用**：会改订单状态并给真实用户发站内信。二次确认放在页面里，
 * 不要在别处复用这两个函数而不加确认。
 */
/**
 * 覆盖本次扫描的静默期（分钟）。不传 = 后端 A 规则的默认 2 小时。
 *
 * `0` 是合法值 = 不设静默期。**cron 路径不受影响**，这个参数只作用于这一次手动触发。
 */
const body = (quietWindowMinutes?: number) =>
  quietWindowMinutes === undefined ? {} : { quietWindowMinutes }

export const runExpireScan = (quietWindowMinutes?: number) =>
  request.post<never, ApiResponse<ExpireScanResult>>('/admin/tasks/expire-scan', body(quietWindowMinutes))

export const runDailyReminder = (quietWindowMinutes?: number) =>
  request.post<never, ApiResponse<DailyReminderResult>>('/admin/tasks/daily-reminder', body(quietWindowMinutes))
