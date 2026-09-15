import request from "./request";
import type { ApiResponse, BookingQueryParams } from "../types";

/** 批量退款任务状态 */
export type BatchRefundTaskStatus =
  | "RUNNING"
  | "SUBMISSION_COMPLETED"
  | "COMPLETED"
  | "COMPLETED_WITH_FAILURES";

/** 预览响应 */
export interface BatchRefundPreviewData {
  refundable: { count: number; totalAmount: number; peopleCount: number };
  unrefundable: Array<{
    reason: string;
    label: string;
    count: number;
    bookingIds: string[];
  }>;
  detailPreview: Array<{
    bookingId: string;
    name: string;
    phone: string;
    personCount: number;
    amount: number;
  }>;
  runningTask: { taskId: string; pending: number; total: number } | null;
}

/** 任务元信息 */
export interface BatchRefundTask {
  taskId: string;
  selectionSummary: string | null;
  status: BatchRefundTaskStatus;
  totalTarget: number;
  reason: string;
  operatorAdminId: string;
  createdAt: number | null;
  startedAt: number | null;
  submissionCompletedAt: number | null;
  completedAt: number | null;
  errorSummary: string | null;
}

/** 实时聚合进度（互斥：pending+processing+confirmed+failed=total，金额单位分） */
export interface BatchRefundProgress {
  total: number;
  pending: number;
  processing: number;
  confirmed: number;
  failed: number;
  confirmedAmount: number;
}

export interface BatchRefundTaskDetail extends BatchRefundTask {
  progress: BatchRefundProgress;
}

export interface ExecuteBatchRefundResult {
  taskId: string;
  totalTarget: number;
  status: BatchRefundTaskStatus;
}

/** 预览：对勾选订单逐单分类 */
export const previewBatchRefund = (bookingIds: string[]) =>
  request.post<never, ApiResponse<BatchRefundPreviewData>>(
    "/admin/batch-refund/preview",
    { bookingIds },
  );

/** 执行：事务创建任务并冻结订单，立即返回 taskId（409 时 error.response.data.taskId 为当前任务） */
export const executeBatchRefund = (bookingIds: string[], reason: string) =>
  request.post<never, ApiResponse<ExecuteBatchRefundResult>>(
    "/admin/batch-refund/execute",
    { bookingIds, reason },
  );

/** 历史任务列表 */
export const getBatchRefundTasks = (limit = 20) =>
  request.get<never, ApiResponse<BatchRefundTask[]>>("/admin/batch-refund/tasks", {
    params: { limit },
  });

/** 任务详情（含实时聚合进度） */
export const getBatchRefundTask = (taskId: string) =>
  request.get<never, ApiResponse<BatchRefundTaskDetail>>(
    `/admin/batch-refund/tasks/${taskId}`,
  );

/** 全选当前筛选结果：与订单列表相同筛选下的全部订单 ID（超 1000 后端报 400） */
export const getBookingIds = (params?: BookingQueryParams) =>
  request.get<never, ApiResponse<{ ids: string[]; total: number }>>(
    "/admin/bookings/ids",
    { params },
  );
