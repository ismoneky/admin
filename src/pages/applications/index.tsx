import { useEffect, useState } from 'react'
import {
  Table,
  Tag,
  Button,
  Space,
  Select,
  Modal,
  Input,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getApplications, approveApplication, rejectApplication } from '../../api/applications'
import type { Application, ApplicationStatus } from '../../types'

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
]

const statusTagMap: Record<ApplicationStatus, { color: string; text: string }> = {
  pending: { color: 'gold', text: '待审批' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已拒绝' },
}

export default function ApplicationsPage() {
  const [list, setList] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [rejectModal, setRejectModal] = useState<{ open: boolean; applicationId: string }>({
    open: false,
    applicationId: '',
  })
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchList = async (status?: string) => {
    setLoading(true)
    try {
      const params = status ? { status: status as ApplicationStatus } : undefined
      const res = await getApplications(params)
      if (res.success && res.data) {
        setList(res.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList(statusFilter || undefined)
  }, [statusFilter])

  const handleApprove = async (applicationId: string) => {
    setActionLoading(true)
    try {
      const res = await approveApplication(applicationId)
      if (res.success) {
        message.success('审批通过')
        fetchList(statusFilter || undefined)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectConfirm = async () => {
    setActionLoading(true)
    try {
      const res = await rejectApplication(rejectModal.applicationId, rejectionReason || undefined)
      if (res.success) {
        message.success('已拒绝')
        setRejectModal({ open: false, applicationId: '' })
        setRejectionReason('')
        fetchList(statusFilter || undefined)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const columns: ColumnsType<Application> = [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
    },
    {
      title: '申请理由',
      dataIndex: 'reason',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: ApplicationStatus) => {
        const { color, text } = statusTagMap[status]
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '拒绝原因',
      dataIndex: 'rejectionReason',
      ellipsis: true,
      width: 180,
      render: (val?: string) => val || '-',
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      width: 160,
      render: (_, record) => {
        if (record.status !== 'pending') return '-'
        return (
          <Space>
            <Button
              type="link"
              size="small"
              loading={actionLoading}
              onClick={() => handleApprove(record.applicationId)}
            >
              通过
            </Button>
            <Button
              type="link"
              size="small"
              danger
              onClick={() => {
                setRejectionReason('')
                setRejectModal({ open: true, applicationId: record.applicationId })
              }}
            >
              拒绝
            </Button>
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>管理员申请</h2>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          style={{ width: 120 }}
        />
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={false}
        scroll={{ x: 900, y: 'calc(100vh - 390px)' }}
      />

      <Modal
        title="拒绝申请"
        open={rejectModal.open}
        onOk={handleRejectConfirm}
        onCancel={() => setRejectModal({ open: false, applicationId: '' })}
        confirmLoading={actionLoading}
        okText="确认拒绝"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={3}
          placeholder="请输入拒绝原因（选填）"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </Modal>
    </div>
  )
}
