// 公告
export interface Announcement {
  id: string
  announcementId: string
  title: string
  content: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateAnnouncementDto {
  title: string
  content: string
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateAnnouncementDto {
  title?: string
  content?: string
  isActive?: boolean
  sortOrder?: number
}

// 系统配置
export interface TimeSlotLimit {
  morningMaxPeople: number
  afternoonMaxPeople: number
  quotaDisplayThresholdPercent?: number
}

export interface PaymentConfig {
  paymentAmount: number
  freeQuotaEnabled?: boolean
  freeQuotaLimit?: number
}

export interface NoticeConfig {
  enabled: boolean
  content: string
}

export interface Banner {
  imageUrl: string
}

export interface SystemConfig {
  id: string
  bookingEnabled: boolean
  bookingDisabledMessage: string
  banners: Banner[]
  bannersJson: string
  timeSlotLimitJson: string
  paymentConfigJson: string
  noticeConfigJson: string
  createdAt: string
  updatedAt: string
}

export interface UpdateSystemConfigDto {
  bookingEnabled?: boolean
  bookingDisabledMessage?: string
  banners?: Banner[]
  timeSlotLimit: TimeSlotLimit
  paymentConfig: PaymentConfig
  noticeConfig?: NoticeConfig
}

// 预约订单
export type TimeSlot = 'morning' | 'afternoon'
export type TravelMode = 'scenicBus' | 'selfDriving' | 'tourGroup'
export type VehicleType = 'wheelMotorcycle' | 'smallCar'
// 顺序与后端 nest/src/entities/booking.entity.ts 的 BookingStatus 枚举一致，便于跨仓对照
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  // 预约日已过且未核销。后端 2026-09-13 起由 T1 扫描写入（此前会被刷成 completed）
  | 'expired'

export type PassengerType = 'adult' | 'child' | 'senior'

export type PassengerPricingReason =
  | 'member_order_free'
  | 'daily_quota_order_free'
  | 'child_age_free'
  | 'senior_age_free'
  | 'id_card_unavailable'
  | 'regular'

export type FreeReason = 'member' | 'dailyQuota' | 'age' | null

export interface Passenger {
  name: string
  phone: string
  idCard: string
  // 以下新字段均为可选，兼容旧订单快照（旧订单读取层按默认值归一化，不重新计算年龄）
  passengerType?: PassengerType
  idCardUnavailable?: boolean
  ageValue?: number | null
  ageFree?: boolean
  finalCharged?: boolean
  pricingReason?: PassengerPricingReason
}

export interface Booking {
  id: string
  /** 业务订单号（列表与详情都下发；对用户展示的「订单号」就是它） */
  bookingId: string
  wechatOpenId: string
  passengers?: string | Passenger[]
  name: string
  phone: string
  idCard: string
  bookingDate: string
  timeSlot: TimeSlot
  travelMode: TravelMode
  outTradeNo: string
  licensePlate?: string
  vehicleType?: VehicleType
  tourGroupName?: string
  tourOrderNumber?: string
  personCount: number
  remarks?: string
  status: BookingStatus
  isFree?: boolean
  freeReason?: FreeReason
  amount?: number | null
  /**
   * 过期时刻，由后端 T1 扫描写入（阶段 2A）。新单是预约日当天 23:59:59，
   * 历史回刷单是「回刷当天」——退款申请截止日按此字段推算，
   * 所以运营话术不能拿 bookingDate 反推。
   */
  expiredAt?: string | null
  /** 核销时刻（ISO）。只有 completed 有值——唯一写入方是 markVerified */
  verifiedAt?: string | null
  /** 核销员 openid。姓名解析不到时用它追责 */
  verifiedBy?: string | null
  /** 核销员姓名，后端由 verifiedBy 解析下发。解析不到为 null */
  verifiedByName?: string | null
  createdAt: string
  updatedAt: string
}

export interface BookingQueryParams {
  page?: number
  pageSize?: number
  bookingDate?: string
  createdStart?: string
  createdEnd?: string
  timeSlot?: TimeSlot
  status?: BookingStatus | BookingStatus[]
  keyword?: string
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface BookingListResponse {
  success: boolean
  data: Booking[]
  pagination: Pagination
}

// 月卡会员
export type MemberStatus = 'active' | 'expired' | 'disabled'

export interface Member {
  id: number
  memberId: string
  wechatOpenId: string
  name: string
  phone: string
  idCard: string
  /** 车牌号列表，后端分号分隔字符串（如 京A12345;京B67890），前端展示时 split */
  licensePlates: string
  status: MemberStatus
  startDate: string
  endDate: string
  remarks: string
  createdAt: string
  updatedAt: string
}

export interface CreateMemberDto {
  phone: string
  name: string
  idCard: string
  licensePlates: string[]
  startDate: string
  endDate: string
  remarks?: string
}

export interface UpdateMemberDto {
  name?: string
  phone?: string
  idCard?: string
  licensePlates?: string[]
  startDate?: string
  endDate?: string
  status?: MemberStatus
  remarks?: string
}

export interface MemberQueryParams {
  keyword?: string
  status?: MemberStatus
  page?: number
  pageSize?: number
}

export interface MemberListResponse {
  success: boolean
  data: Member[]
  pagination: Pagination
}

// 管理员申请
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface Application {
  id: string
  applicationId: string
  name: string
  phone: string
  reason: string
  status: ApplicationStatus
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface ApplicationQueryParams {
  status?: ApplicationStatus
}

// 反馈
export interface Feedback {
  feedbackId: string
  wechatOpenId: string
  phone: string
  content: string
  createdAt: string
}

// 通用响应
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: unknown
}

// 经营统计
export interface BookingDashboardRange {
  startDate: string
  endDate: string
}

export interface BookingDashboardSummary {
  validOrderCount: number
  totalPeople: number
  selfDrivingVehicleCount: number
  receivedAmount: number // 分
  freePeople: number
  paidPeople: number
}

export interface BookingDashboardStatusItem {
  status: BookingStatus
  orderCount: number
}

export interface BookingDashboardTravelModeItem {
  travelMode: TravelMode
  orderCount: number
  peopleCount: number
}

export interface BookingDashboardDailyTrendItem {
  date: string
  validOrderCount: number
  peopleCount: number
  selfDrivingVehicleCount: number
  receivedAmount: number // 分
}

export interface BookingDashboardResponse {
  range: BookingDashboardRange
  summary: BookingDashboardSummary
  statusDistribution: BookingDashboardStatusItem[]
  travelModeDistribution: BookingDashboardTravelModeItem[]
  dailyTrend: BookingDashboardDailyTrendItem[]
}

// 退款申请与审核（订单过期与退款闭环 v2 阶段 3）
//
// 状态是**申请单**的状态，不是订单状态。订单全程保持 `expired`，
// 「审核中 / 已驳回」这些用户可见的态由此字段组合出来（方案 §4.3.5）。
export type RefundApplyStatus = 'pending' | 'approved' | 'rejected' | 'success' | 'failed'

export interface RefundApply {
  id: number
  /** 申请单号，如 RAxxxxxxxxxxx */
  applyNo: string
  bookingId: string
  wechatOpenId: string
  /** 第几次申请，从 1 起。被驳回也占序号，故不连续于「已用额度」 */
  applyCount: number
  reason: string
  status: RefundApplyStatus
  /** 单位：分 */
  refundAmount: number
  /** 微信退款单号，审核通过时写入 */
  outRefundNo?: string | null
  auditAdminId?: number | null
  auditAdminName?: string | null
  auditAt?: string | null
  auditRemark?: string | null
  rejectReason?: string | null
  createdAt: string
  updatedAt: string
  /** 派生字段（不落库）：pending 且已超过 48h 审核 SLA */
  isTimeout?: boolean
}

export interface RefundApplyQueryParams {
  status?: RefundApplyStatus
  createdStart?: string
  createdEnd?: string
  keyword?: string
  page?: number
  pageSize?: number
}

export interface RefundApplyListResponse {
  success: boolean
  data: RefundApply[]
  pagination: Pagination
}

/** 审核详情：申请单 + 订单快照 + 该订单的全部历史申请（按序号正序） */
export interface RefundApplyDetailResponse {
  success: boolean
  data: {
    apply: RefundApply
    booking: Booking
    history: RefundApply[]
  }
}

// 站内信（阶段 4 §4.4 / §6）
//
// ⚠️ 这里**只有发送**，没有列表查询：本轮没有「管理端查看某用户消息历史」的接口，
// 也没有前端自造一个（`GET /messages` 是用户端接口，只认 token 里的 openid，
// 管理员拿不到别人的消息）。要看用户收到了什么，去订单/反馈详情页看对应业务，
// 或在 `app-logs` 里按 `action: send-message` 查发送留痕。
export interface SendMessageParams {
  /** 接收人 openid（从订单 / 反馈详情里取，见发送页的说明） */
  openid: string
  title: string
  content: string
  /** 预留：请求服务号推送。本期后端不投递，响应里的 `oaSent` 恒为 false */
  sendOa?: boolean
}

export interface SendMessageResult {
  messageId: number | null
  /** 落库时刻（epoch ms），失败时为 null */
  createdAt: number | null
  /**
   * 服务号是否真的投递了。
   *
   * **由后端下发，前端不硬编码**——本期恒为 false（`OA_ENABLED=false`），
   * 服务号分支上线后这里会变成真实结果，前端不用跟着改。
   * 前端据此显示「仅站内信」的提示，不要自己写死那句话。
   */
  oaSent: boolean
}

// ── 定时任务手动触发（POST /admin/tasks/*）────────────────────────────────────
//
// 字段与后端的 `ExpireScanResult` / `DailyReminderResult` 一一对应。
// 「什么都没干」有两种原因，所以是两个字段而不是一个：`skipped` 是重入锁
// （上一轮还没跑完），`error` 是执行中抛了异常。混成一个会让操作者
// 分不清「该再点一次」还是「该去看日志」。

/** T1 过期扫描结果 */
export interface ExpireScanResult {
  /** 命中重入锁：上一轮尚未结束，本次什么都没做 */
  skipped: boolean
  /** 被置为 expired 的订单数 */
  expiredCount: number
  /** 发出（或早已存在）的「订单已过期」站内信数 */
  notifiedCount: number
  /** 本次实际生效的静默期（分钟）。定时任务恒为 120；手动触发可覆盖 */
  quietWindowMinutes: number
  /**
   * 本次是否把**当天**的订单也算进了过期边界（`bookingDate <= 今天`）。
   *
   * 定时任务恒为 false（当天全天可核销）；手动触发默认 true。
   * 回传出来是因为它决定了这一轮到底动了哪些单，看漏会误判成「任务没生效」。
   */
  includedToday: boolean
  /** 失败原因；null = 正常完成 */
  error: string | null
}

/** T2 每日提醒结果（一次扫描覆盖两件事） */
export interface DailyReminderResult {
  /** 命中重入锁 */
  skipped: boolean
  /** 当天未核销、被扫到的订单数 */
  todayPendingCount: number
  /** 实际发出的「即将过期」提醒数（被每日消息上限挡下的不计入） */
  remindedCount: number
  /** 近 N 天已过期未通知、被扫到的订单数 */
  expiredPendingCount: number
  /** 实际发出的「已过期可退款」提醒数 */
  recalledCount: number
  /**
   * 本次实际生效的静默期（分钟），**只作用于 ①**。
   * ②（已过期可退款）用的是退款申请时限窗口，与下单时间无关。
   */
  quietWindowMinutes: number
  /** 同 ExpireScanResult.error */
  error: string | null
}

// ── 日志查询（GET /admin/logs、/admin/logs/stats）────────────────────────────
//
// 日志在**独立的 logs.db**（`app_logs` 表），保留 30 天，每天 03:21 清理。
// 三个枚举都要与后端 `app-log.entity.ts` 保持一致——不一致时筛选条件会被后端
// 的 `@IsEnum` 挡下（400），不会静默返回错结果。

/** 与后端 AppLogSource 一致 */
export type LogSource = 'backend' | 'miniprogram' | 'admin'

/** 与后端 AppLogLevel 一致 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 与后端 AppLogCategory 一致 */
export type LogCategory = 'request' | 'booking' | 'payment' | 'network' | 'ui' | 'runtime'

export interface AppLog {
  id: number
  logId: string
  source: LogSource
  level: LogLevel
  category: LogCategory
  message: string
  /** 服务端请求关联标识 */
  requestId: string | null
  /** 小程序匿名会话标识 */
  sessionId: string | null
  /** 页面路由或后端请求路径 */
  route: string | null
  /** 已脱敏的结构化上下文（JSON 字符串，后端入库前已过滤敏感字段） */
  contextJson: string | null
  appVersion: string | null
  platform: string | null
  /** 客户端产生日志的时刻（epoch ms） */
  clientCreatedAt: number | null
  /** 服务端接收/产生日志的时刻（epoch ms） */
  createdAt: number
}

export interface LogQueryParams {
  source?: LogSource
  level?: LogLevel
  category?: LogCategory
  /** 模糊匹配 message / route / logId */
  keyword?: string
  /** YYYY-MM-DD */
  start?: string
  /** YYYY-MM-DD */
  end?: string
  page?: number
  /** 后端上限 100 */
  pageSize?: number
}

/**
 * 列表响应
 *
 * 注意与其它列表接口的形状不同：这个把分页字段**平铺在 data 里**，
 * 而不是 orders 那样的 `{ data, pagination }`——照后端原样建模。
 */
export interface LogListResult {
  logs: AppLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface LogStats {
  total: number
  bySource: Record<string, number>
  byLevel: Record<string, number>
  /**
   * 所选时间范围内的 ERROR 条数。
   *
   * 名字叫 recent 但**不含"最近"语义**——它就是 `byLevel.error`，后端单独算出来
   * 方便前端直接展示。页面上的标签写「错误数」，别照字面翻成「近期错误」。
   */
  recentErrors: number
}
