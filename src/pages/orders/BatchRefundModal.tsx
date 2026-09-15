import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Modal,
  Button,
  Space,
  Tag,
  Alert,
  Input,
  Statistic,
  Row,
  Col,
  Progress,
  Table,
  Collapse,
  Typography,
  message,
} from 'antd'
import { ExclamationCircleFilled } from '@ant-design/icons'
import {
  previewBatchRefund,
  executeBatchRefund,
  getBatchRefundTask,
} from '../../api/batchRefund'
import type {
  BatchRefundPreviewData,
  BatchRefundTaskDetail,
  BatchRefundTaskStatus,
} from '../../api/batchRefund'

const { Text } = Typography

const TASK_STATUS_MAP: Record<BatchRefundTaskStatus, { label: string; color: string }> = {
  RUNNING: { label: '提交中', color: 'processing' },
  SUBMISSION_COMPLETED: { label: '已提交·待确认', color: 'warning' },
  COMPLETED: { label: '全部退款成功', color: 'success' },
  COMPLETED_WITH_FAILURES: { label: '完成·存在失败', color: 'error' },
}

const fenToYuan = (fen: number) => `¥${(fen / 100).toFixed(2)}`

export interface BatchRefundModalProps {
  open: boolean
  /** 执行模式：勾选的订单 ID 列表 */
  bookingIds?: string[]
  /** 进度模式：直接查看已有任务（与 bookingIds 互斥） */
  taskId?: string
  onClose: () => void
}

/**
 * 批量退款弹层：预览 → 填原因 → 强确认 → 执行 → 进度轮询。
 * 页面/弹层关闭不影响后台任务；进度模式可查看任意任务。
 */
export default function BatchRefundModal({ open, bookingIds, taskId, onClose }: BatchRefundModalProps) {
  const [phase, setPhase] = useState<'preview' | 'progress'>('preview')
  const [preview, setPreview] = useState<BatchRefundPreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [executing, setExecuting] = useState(false)
  const [task, setTask] = useState<BatchRefundTaskDetail | null>(null)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
  }

  const loadTask = useCallback(async (id: string) => {
    try {
      const res = await getBatchRefundTask(id)
      if (res.success && res.data) {
        setTask(res.data)
        // 终态后停止轮询
        if (res.data.status === 'COMPLETED' || res.data.status === 'COMPLETED_WITH_FAILURES') {
          stopPolling()
        }
      }
    } catch {
      // 拦截器已提示；本轮失败等下一轮
    }
  }, [])

  const startProgress = useCallback(
    (id: string) => {
      setPhase('progress')
      stopPolling()
      loadTask(id)
      pollTimer.current = setInterval(() => loadTask(id), 4000)
    },
    [loadTask],
  )

  // 打开时初始化：执行模式拉预览；进度模式直接轮询
  useEffect(() => {
    if (!open) return
    setReason('')
    setTask(null)
    setPreview(null)
    if (taskId) {
      startProgress(taskId)
    } else if (bookingIds?.length) {
      setPhase('preview')
      setPreviewLoading(true)
      previewBatchRefund(bookingIds)
        .then((res) => {
          if (res.success && res.data) setPreview(res.data)
        })
        .catch(() => onClose())
        .finally(() => setPreviewLoading(false))
    }
    return stopPolling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleExecute = () => {
    if (!preview || !bookingIds) return
    const { count, totalAmount } = preview.refundable
    Modal.confirm({
      title: '确认执行批量退款？',
      icon: <ExclamationCircleFilled style={{ color: '#f5222d' }} />,
      content: `将立即向微信提交 ${count} 笔退款申请，共 ${fenToYuan(totalAmount)}。执行后不能暂停或撤销，是否确认？`,
      okText: '确认执行',
      okButtonProps: { danger: true },
      cancelText: '再想想',
      onOk: async () => {
        setExecuting(true)
        try {
          const res = await executeBatchRefund(bookingIds, reason.trim())
          if (res.success && res.data) {
            message.success(`已创建退款任务，实际冻结 ${res.data.totalTarget} 单`)
            startProgress(res.data.taskId)
          }
        } catch (err: any) {
          // 409：已有 RUNNING 任务 → 跳转到当前任务进度
          const runningTaskId = err?.response?.data?.taskId
          if (err?.response?.status === 409 && runningTaskId) {
            message.warning('已有正在执行的批量退款任务，已为你打开当前任务')
            startProgress(runningTaskId)
          }
        } finally {
          setExecuting(false)
        }
      },
    })
  }

  const handleClose = () => {
    stopPolling()
    onClose()
  }

  const refundable = preview?.refundable
  const reasonValid = reason.trim().length >= 2 && reason.trim().length <= 80
  const progress = task?.progress
  const finished = task?.status === 'COMPLETED' || task?.status === 'COMPLETED_WITH_FAILURES'
  const percent = progress && progress.total > 0 ? Math.round(((progress.confirmed + progress.failed) / progress.total) * 100) : 0

  return (
    <Modal
      title={phase === 'preview' ? '批量退款预览' : '批量退款进度'}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={{ xs: 'calc(100vw - 32px)', sm: 760 }}
      destroyOnHidden
    >
      {phase === 'preview' && (
        <div style={{ marginTop: 16 }}>
          {preview?.runningTask && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={`已有正在执行的批量退款任务（${preview.runningTask.taskId}，待提交 ${preview.runningTask.pending}/${preview.runningTask.total}）`}
              description="同一时间只能执行一个批量任务，可查看当前任务进度。"
              action={
                <Button size="small" onClick={() => startProgress(preview.runningTask!.taskId)}>
                  查看当前任务
                </Button>
              }
            />
          )}

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title="可退订单" value={refundable?.count ?? 0} suffix="单" loading={previewLoading} />
            </Col>
            <Col span={8}>
              <Statistic
                title="可退金额"
                value={refundable ? (refundable.totalAmount / 100).toFixed(2) : '0.00'}
                prefix="¥"
                loading={previewLoading}
              />
            </Col>
            <Col span={8}>
              <Statistic title="覆盖人数" value={refundable?.peopleCount ?? 0} suffix="人" loading={previewLoading} />
            </Col>
          </Row>

          {preview && preview.unrefundable.length > 0 && (
            <Collapse
              style={{ marginBottom: 16 }}
              items={preview.unrefundable.map((b) => ({
                key: b.reason,
                label: (
                  <Space>
                    <Tag color="orange">{b.label}</Tag>
                    <Text type="secondary">{b.count} 单（不进入退款任务）</Text>
                  </Space>
                ),
                children: (
                  <div style={{ maxHeight: 120, overflow: 'auto', wordBreak: 'break-all', lineHeight: 2 }}>
                    {b.bookingIds.map((id) => (
                      <Tag key={id} style={{ fontFamily: 'monospace' }}>{id}</Tag>
                    ))}
                  </div>
                ),
              }))}
            />
          )}

          {preview && preview.detailPreview.length > 0 && (
            <Collapse
              style={{ marginBottom: 16 }}
              items={[
                {
                  key: 'detail',
                  label: `可退明细（掩码，前 ${preview.detailPreview.length} 条）`,
                  children: (
                    <Table
                      size="small"
                      rowKey="bookingId"
                      dataSource={preview.detailPreview}
                      pagination={false}
                      scroll={{ y: 240 }}
                      columns={[
                        { title: '订单号', dataIndex: 'bookingId', width: 150 },
                        { title: '姓名', dataIndex: 'name', width: 80 },
                        { title: '手机号', dataIndex: 'phone', width: 120 },
                        { title: '人数', dataIndex: 'personCount', width: 60 },
                        { title: '金额', dataIndex: 'amount', width: 90, render: (v: number) => fenToYuan(v) },
                      ]}
                    />
                  ),
                },
              ]}
            />
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              退款原因 <Text type="secondary">（2-80 字，透传微信退款申请）</Text>
            </div>
            <Input.TextArea
              rows={2}
              maxLength={80}
              showCount
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="如：天气原因景区临时关闭，统一退款"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleClose}>取消</Button>
            <Button
              type="primary"
              danger
              loading={executing}
              disabled={!refundable || refundable.count === 0 || !reasonValid || !!preview?.runningTask}
              onClick={handleExecute}
            >
              执行批量退款{refundable && refundable.count > 0 ? `（${refundable.count} 单）` : ''}
            </Button>
          </div>
        </div>
      )}

      {phase === 'progress' && task && progress && (
        <div style={{ marginTop: 16 }}>
          <Space style={{ marginBottom: 16 }} wrap>
            <Tag color={TASK_STATUS_MAP[task.status].color}>{TASK_STATUS_MAP[task.status].label}</Tag>
            <Text type="secondary">任务 {task.taskId}</Text>
            {task.selectionSummary && <Text type="secondary">日期：{task.selectionSummary}</Text>}
          </Space>

          <Progress percent={percent} status={task.status === 'COMPLETED_WITH_FAILURES' ? 'exception' : undefined} />

          <Row gutter={16} style={{ margin: '16px 0' }}>
            <Col span={4}><Statistic title="总目标" value={progress.total} /></Col>
            <Col span={5}><Statistic title="待提交" value={progress.pending} /></Col>
            <Col span={5}><Statistic title="处理中" value={progress.processing} /></Col>
            <Col span={5}><Statistic title="已确认" value={progress.confirmed} valueStyle={{ color: '#3f8600' }} /></Col>
            <Col span={5}><Statistic title="失败" value={progress.failed} valueStyle={progress.failed > 0 ? { color: '#cf1322' } : undefined} /></Col>
          </Row>

          <Alert
            type={finished ? (progress.failed > 0 ? 'warning' : 'success') : 'info'}
            showIcon
            message={
              finished
                ? `任务结束：已确认退款 ${progress.confirmed} 单，共 ${fenToYuan(progress.confirmedAmount)}`
                : `已确认退款 ${fenToYuan(progress.confirmedAmount)}，后台持续提交中，可关闭本窗口`
            }
            description={
              progress.failed > 0
                ? `有 ${progress.failed} 单退款失败${task.errorSummary ? `（${task.errorSummary}）` : ''}，请到订单详情页人工处理。`
                : undefined
            }
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button onClick={handleClose}>关闭（任务继续执行）</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
