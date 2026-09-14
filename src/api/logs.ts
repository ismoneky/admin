import request from './request'
import type { ApiResponse, LogListResult, LogQueryParams, LogStats } from '../types'

/**
 * 日志查询（`GET /admin/logs`）
 *
 * ── 能查到什么、查不到什么 ────────────────────────────────────────────────
 * 这里读的是 `logs.db` 的 `app_logs` 表：**只保留 30 天**（每天 03:21 清理），
 * 所以更早的日志不是"查询失败"，是已经删了。
 *
 * ⚠️ 表里**只有结构化业务日志**（`LoggingService.write()` 那条路）。Nest 的
 * `Logger` 写的是 stdout，进 pm2 自己的日志文件，**不在这张表里**——排查启动期、
 * 框架层的问题要去看进程日志，别在这里找不到就以为没发生。
 */
export const queryLogs = (params: LogQueryParams) =>
  request.get<never, ApiResponse<LogListResult>>('/admin/logs', { params })

/**
 * 基础统计（`GET /admin/logs/stats`）
 *
 * **只吃 `start` / `end`**：来源/级别/分类/关键字这些筛选条件不参与统计。
 * 所以卡片上的数字是「所选时间范围内的总量」，不是"当前筛选结果的量"。
 */
export const getLogStats = (params: Pick<LogQueryParams, 'start' | 'end'>) =>
  request.get<never, ApiResponse<LogStats>>('/admin/logs/stats', { params })
