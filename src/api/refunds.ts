import request from './request'
import type {
  ApiResponse,
  RefundApply,
  RefundApplyDetailResponse,
  RefundApplyListResponse,
  RefundApplyQueryParams,
} from '../types'

export const getRefundApplies = (params?: RefundApplyQueryParams) =>
  request.get<never, RefundApplyListResponse>('/admin/refund-applies', { params })

export const getRefundApplyDetail = (applyNo: string) =>
  request.get<never, RefundApplyDetailResponse>(`/admin/refund-applies/${applyNo}`)

/**
 * 审核通过——后端会**同时发起真实退款**，不是只改单据状态。
 *
 * 失败语义有两层，前端要分开对待（见实现说明 24）：
 *   - `APPLY_ALREADY_HANDLED`：另一个管理员刚处理过，刷新列表即可；
 *   - 其它（如微信调用失败）：单据已是 approved、订单停在 refunding，
 *     由后端 15 分钟对账兜底收敛。**重复点「通过」不会重试退款**（条件更新挡掉），
 *     所以这里提示用户「已通过，退款处理中」而不是「请重试」。
 */
export const approveRefundApply = (applyNo: string, remark?: string) =>
  request.post<never, ApiResponse<{ apply: RefundApply; outRefundNo: string }>>(
    `/admin/refund-applies/${applyNo}/approve`,
    { remark },
  )

export const rejectRefundApply = (applyNo: string, rejectReason: string, remark?: string) =>
  request.post<never, ApiResponse<RefundApply>>(`/admin/refund-applies/${applyNo}/reject`, {
    rejectReason,
    remark,
  })
