import request from './request'
import type { ApiResponse, SendMessageParams, SendMessageResult } from '../types'

/**
 * 管理员向单个用户发送站内信（§6）
 *
 * 只有发送，没有列表/撤回：站内信是**通知**而不是工单，发出去就进了用户的消息中心，
 * 没有「撤回」这个概念（撤回需要一个用户已读前的窗口，而站内信没有推送，
 * 用户可能几天后才看到——那个窗口无法定义）。
 *
 * 后端**不会**校验 openid 是否存在（见 `SendMessageDto` 注释：`user_profiles`
 * 只是「填过资料的用户」，很多用户只下单不填资料）。所以这里也不做前置校验，
 * 只把「发给谁」如实展示给操作者确认。
 */
export const sendAdminMessage = (data: SendMessageParams) =>
  request.post<never, ApiResponse<SendMessageResult>>('/admin/messages/send', data)
