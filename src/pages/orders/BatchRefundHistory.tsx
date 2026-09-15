import { useCallback, useEffect, useState } from 'react'
import { Drawer, Table, Tag, Button, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getBatchRefundTasks } from '../../api/batchRefund'
import type { BatchRefundTask, BatchRefundTaskStatus } from '../../api/batchRefund'

const { Text } = Typography

const TASK_STATUS_MAP: Record<BatchRefundTaskStatus, { label: string; color: string }> = {
  RUNNING: { label: '提交中', color: 'processing' },
  SUBMISSION_COMPLETED: { label: '已提交·待确认', color: 'warning' },
  COMPLETED: { label: '全部退款成功', color: 'success' },
  COMPLETED_WITH_FAILURES: { label: '完成·存在失败', color: 'error' },
}

export interface BatchRefundHistoryProps {
  open: boolean
  onClose: () => void
  /** 查看某个任务的进度详情 */
  onViewTask: (taskId: string) => void
}

/** 批量退款历史任务（最近 20 条） */
export default function BatchRefundHistory({ open, onClose, onViewTask }: BatchRefundHistoryProps) {
  const [tasks, setTasks] = useState<BatchRefundTask[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getBatchRefundTasks(20)
      if (res.success && res.data) setTasks(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  return (
    <Drawer
      title="批量退款历史任务"
      open={open}
      onClose={onClose}
      width={720}
      extra={
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          刷新
        </Button>
      }
    >
      <Table
        size="small"
        rowKey="taskId"
        dataSource={tasks}
        loading={loading}
        pagination={false}
        columns={[
          {
            title: '任务 ID',
            dataIndex: 'taskId',
            width: 150,
            render: (v: string) => <Text style={{ fontFamily: 'monospace' }}>{v}</Text>,
          },
          {
            title: '日期摘要',
            dataIndex: 'selectionSummary',
            width: 130,
            render: (v: string | null) => v ?? '-',
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 120,
            render: (v: BatchRefundTaskStatus) => {
              const s = TASK_STATUS_MAP[v]
              return s ? <Tag color={s.color}>{s.label}</Tag> : v
            },
          },
          { title: '目标单数', dataIndex: 'totalTarget', width: 80 },
          { title: '退款原因', dataIndex: 'reason', ellipsis: true },
          { title: '操作人', dataIndex: 'operatorAdminId', width: 90 },
          {
            title: '创建时间',
            dataIndex: 'createdAt',
            width: 130,
            render: (v: number | null) => (v ? dayjs(v).format('MM-DD HH:mm:ss') : '-'),
          },
          {
            title: '操作',
            width: 80,
            render: (_, record) => (
              <Button type="link" size="small" onClick={() => onViewTask(record.taskId)}>
                详情
              </Button>
            ),
          },
        ]}
      />
      {tasks.length === 0 && !loading && (
        <div style={{ textAlign: 'center', color: '#999', marginTop: 32 }}>暂无历史任务</div>
      )}
    </Drawer>
  )
}
