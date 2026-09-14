import { useCallback, useEffect, useState } from 'react'
import {
  Table,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Modal,
  Descriptions,
  message,
} from 'antd'
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  getRefundApplies,
  getRefundApplyDetail,
  approveRefundApply,
  rejectRefundApply,
} from '../../api/refunds'
import type {
  Booking,
  RefundApply,
  RefundApplyDetailResponse,
  RefundApplyQueryParams,
  RefundApplyStatus,
} from '../../types'
import { BOOKING_STATUS_MAP } from '../../constants/booking'

/**
 * 申请单状态 → 展示。
 *
 * ⚠️ 这是**申请单**的状态，不是订单状态。订单从申请到退款全程保持 `expired`
 * （方案 §4.3.5），列表里展示的「已驳回 / 已退款」都来自申请单。
 */
const STATUS_MAP: Record<RefundApplyStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'gold' },
  approved: { label: '已通过', color: 'blue' },
  rejected: { label: '已驳回', color: 'red' },
  success: { label: '已退款', color: 'green' },
  failed: { label: '退款失败', color: 'volcano' },
}

/**
 * 「全部」不是一个选项：多一个 `value: ''` 会让选中它时把 `status=''` 发出去，
 * 而后端 DTO 是 `@IsEnum(RefundApplyStatus)`，空串直接被 400 掉。
 * 清空 = 不传 = 全部，靠 `allowClear` + placeholder 表达（与订单页同款）。
 */
const STATUS_OPTIONS = (Object.entries(STATUS_MAP) as [RefundApplyStatus, { label: string }][]).map(
  ([value, { label }]) => ({ label, value }),
)

/** 分 → 元 */
const yuan = (cents: number) => `¥${((cents ?? 0) / 100).toFixed(2)}`

export default function RefundsPage() {
  const [form] = Form.useForm()
  const [data, setData] = useState<RefundApply[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 })
  const [queryParams, setQueryParams] = useState<RefundApplyQueryParams>({ page: 1, pageSize: 10 })

  const [detail, setDetail] = useState<RefundApplyDetailResponse['data'] | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [approveTarget, setApproveTarget] = useState<RefundApply | null>(null)
  const [rejectTarget, setRejectTarget] = useState<RefundApply | null>(null)
  const [actionRemark, setActionRemark] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async (params: RefundApplyQueryParams) => {
    setLoading(true)
    try {
      const res = await getRefundApplies(params)
      if (res.success) {
        setData(res.data)
        setPagination({
          page: res.pagination.page,
          pageSize: res.pagination.pageSize,
          total: res.pagination.total,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(queryParams)
  }, [queryParams, fetchData])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const params: RefundApplyQueryParams = { page: 1, pageSize: pagination.pageSize }
    if (values.status) params.status = values.status
    if (values.createdRange && values.createdRange.length === 2) {
      params.createdStart = values.createdRange[0].format('YYYY-MM-DD')
      params.createdEnd = values.createdRange[1].format('YYYY-MM-DD')
    }
    if (values.keyword) params.keyword = values.keyword
    setQueryParams(params)
  }

  const handleReset = () => {
    form.resetFields()
    setQueryParams({ page: 1, pageSize: 10 })
  }

  const handleViewDetail = async (applyNo: string) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await getRefundApplyDetail(applyNo)
      if (res.success) setDetail(res.data)
    } finally {
      setDetailLoading(false)
    }
  }

  /**
   * 审核通过 = 真正发起退款。
   *
   * 失败分支刻意分开：`APPLY_ALREADY_HANDLED` 是并发被抢先（刷新即可），
   * 其余是微信调用失败——**单据已是 approved、不会回滚**，重试也不会重复退款，
   * 所以提示「退款处理中，对账会自动收敛」而不是诱导管理员反复点击。
   */
  const handleApproveConfirm = async () => {
    if (!approveTarget) return
    setActionLoading(true)
    try {
      const res = await approveRefundApply(approveTarget.applyNo, actionRemark || undefined)
      if (res.success) {
        message.success('审核通过，退款已发起')
        setApproveTarget(null)
        setActionRemark('')
        fetchData(queryParams)
      }
    } catch (error: any) {
      const code = error?.response?.data?.code
      if (code === 'APPLY_ALREADY_HANDLED') {
        message.warning('该申请已被其他管理员处理，请刷新列表')
      } else {
        message.warning('审核已通过，但退款发起失败，系统将自动重试对账')
      }
      fetchData(queryParams)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      message.warning('请填写驳回理由，该理由会原样发送给用户')
      return
    }
    setActionLoading(true)
    try {
      const res = await rejectRefundApply(rejectTarget.applyNo, rejectReason.trim(), actionRemark || undefined)
      if (res.success) {
        message.success('已驳回')
        setRejectTarget(null)
        setRejectReason('')
        setActionRemark('')
        fetchData(queryParams)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const columns: ColumnsType<RefundApply> = [
    {
      title: '申请单号',
      dataIndex: 'applyNo',
      width: 170,
      render: (val: string, record) => (
        <Space size={4}>
          <span>{val}</span>
          {record.applyCount > 1 && <Tag color="orange">第 {record.applyCount} 次</Tag>}
        </Space>
      ),
    },
    { title: '订单号', dataIndex: 'bookingId', width: 170 },
    {
      title: '退款金额',
      dataIndex: 'refundAmount',
      width: 100,
      render: (val: number) => yuan(val),
    },
    { title: '退款原因', dataIndex: 'reason', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: RefundApplyStatus, record) => {
        const { label, color } = STATUS_MAP[status]
        return (
          <Space size={4}>
            <Tag color={color}>{label}</Tag>
            {/* 48h 审核 SLA：只在待审核时标红，超时的排在前面看 */}
            {record.isTimeout && <Tag color="red">超时</Tag>}
          </Space>
        )
      },
    },
    {
      title: '审核人',
      dataIndex: 'auditAdminName',
      width: 100,
      render: (val?: string | null) => val || '-',
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.applyNo)}>
            详情
          </Button>
          {record.status === 'pending' && (
            <>
              <Button type="link" size="small" onClick={() => { setActionRemark(''); setApproveTarget(record) }}>
                通过
              </Button>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => { setActionRemark(''); setRejectReason(''); setRejectTarget(record) }}
              >
                驳回
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ margin: '0 0 16px' }}>退款审核</h2>

      <Form form={form} layout="inline" style={{ marginBottom: 16, rowGap: 8 }}>
        <Form.Item name="status">
          <Select placeholder="全部状态" options={STATUS_OPTIONS} style={{ width: 130 }} allowClear />
        </Form.Item>
        <Form.Item name="createdRange">
          <DatePicker.RangePicker placeholder={['申请起始', '申请结束']} />
        </Form.Item>
        <Form.Item name="keyword">
          <Input placeholder="申请单号 / 订单号" style={{ width: 200 }} allowClear />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        rowKey="applyNo"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1200, y: 'calc(100vh - 470px)' }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => setQueryParams((prev) => ({ ...prev, page, pageSize })),
        }}
      />

      {/* 审核通过：二次确认。这一步会真正把钱退出去，不能只靠一个 link 点击完成 */}
      <Modal
        title="确认通过退款申请？"
        open={!!approveTarget}
        onOk={handleApproveConfirm}
        onCancel={() => setApproveTarget(null)}
        confirmLoading={actionLoading}
        okText="确认通过并发起退款"
        cancelText="取消"
      >
        {approveTarget && (
          <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
            <Descriptions.Item label="申请单号">{approveTarget.applyNo}</Descriptions.Item>
            <Descriptions.Item label="订单号">{approveTarget.bookingId}</Descriptions.Item>
            <Descriptions.Item label="退款金额">{yuan(approveTarget.refundAmount)}</Descriptions.Item>
            <Descriptions.Item label="用户原因">{approveTarget.reason}</Descriptions.Item>
          </Descriptions>
        )}
        <Input.TextArea
          rows={2}
          placeholder="审核备注（选填，仅内部留痕）"
          value={actionRemark}
          onChange={(e) => setActionRemark(e.target.value)}
        />
      </Modal>

      {/* 驳回：理由必填。它会随站内信原样下发，空理由必然转为客诉 */}
      <Modal
        title="驳回退款申请"
        open={!!rejectTarget}
        onOk={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
        confirmLoading={actionLoading}
        okText="确认驳回"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={3}
          placeholder="驳回理由（必填，会原样发送给用户）"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <Input.TextArea
          rows={2}
          placeholder="审核备注（选填，仅内部留痕）"
          value={actionRemark}
          onChange={(e) => setActionRemark(e.target.value)}
        />
      </Modal>

      {/* 详情：订单快照 + 该订单全部历史申请。历史申请是判断「反复申请」还是「首次申诉」的依据 */}
      <Modal
        title="退款申请详情"
        open={!!detail || detailLoading}
        onCancel={() => setDetail(null)}
        footer={null}
        width={760}
      >
        {detail && (
          <>
            <Descriptions title="订单快照" column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="订单号">{detail.booking.bookingId}</Descriptions.Item>
              <Descriptions.Item label="订单状态">
                {/* 全程是「已过期」才对：申请/审核/退款期间订单状态不变（方案 §4.3.5） */}
                {BOOKING_STATUS_MAP[detail.booking.status]?.label ?? detail.booking.status}
              </Descriptions.Item>
              <Descriptions.Item label="游玩日期">
                {dayjs(detail.booking.bookingDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="下单人">{detail.booking.name}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detail.booking.phone}</Descriptions.Item>
              <Descriptions.Item label="订单金额">{yuan(detail.booking.amount ?? 0)}</Descriptions.Item>
              <Descriptions.Item label="已过期于" span={2}>
                {bookingExpiredText(detail.booking)}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="本次申请" column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="申请单号">{detail.apply.applyNo}</Descriptions.Item>
              <Descriptions.Item label="第几次申请">第 {detail.apply.applyCount} 次</Descriptions.Item>
              <Descriptions.Item label="退款金额">{yuan(detail.apply.refundAmount)}</Descriptions.Item>
              <Descriptions.Item label="状态">{STATUS_MAP[detail.apply.status].label}</Descriptions.Item>
              <Descriptions.Item label="用户原因" span={2}>{detail.apply.reason}</Descriptions.Item>
              {detail.apply.rejectReason && (
                <Descriptions.Item label="驳回理由" span={2}>{detail.apply.rejectReason}</Descriptions.Item>
              )}
              {detail.apply.outRefundNo && (
                <Descriptions.Item label="微信退款单号" span={2}>{detail.apply.outRefundNo}</Descriptions.Item>
              )}
            </Descriptions>

            <h4 style={{ margin: '0 0 8px' }}>历史申请（共 {detail.history.length} 次）</h4>
            <Table
              rowKey="applyNo"
              size="small"
              pagination={false}
              dataSource={detail.history}
              columns={[
                { title: '次数', dataIndex: 'applyCount', width: 60, render: (v: number) => `第 ${v} 次` },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 90,
                  render: (s: RefundApplyStatus) => (
                    <Tag color={STATUS_MAP[s].color}>{STATUS_MAP[s].label}</Tag>
                  ),
                },
                { title: '原因', dataIndex: 'reason', ellipsis: true },
                {
                  title: '驳回理由',
                  dataIndex: 'rejectReason',
                  ellipsis: true,
                  render: (v?: string | null) => v || '-',
                },
                {
                  title: '申请时间',
                  dataIndex: 'createdAt',
                  width: 150,
                  render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
                },
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  )
}

/**
 * 过期时间 + 申请截止日。
 *
 * 申请截止 = expiredAt + 7 天，与后端 `resolveApplyDeadline` 同口径。
 * 注意不能拿 bookingDate 反推：历史回刷单的 expiredAt 是回刷当天，
 * 与 bookingDate 相差很远（这正是运营话术最容易踩的坑）。
 * 截止日在后端才是权威，这里只作展示辅助——按钮可点与否看 `refundEntry.visible`。
 */
function bookingExpiredText(booking: Booking): string {
  if (!booking.expiredAt) return '-'
  const deadline = dayjs(booking.expiredAt).add(7, 'day')
  return `${dayjs(booking.expiredAt).format('YYYY-MM-DD HH:mm')}（申请截止 ${deadline.format('YYYY-MM-DD')}）`
}
