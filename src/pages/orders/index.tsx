import { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Tooltip,
  message,
} from 'antd'
import { SearchOutlined, ReloadOutlined, ExportOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { getBookings, exportBookings } from '../../api/bookings'
import type { Booking, BookingQueryParams, TimeSlot, BookingStatus } from '../../types'
import {
  BOOKING_STATUS_MAP as STATUS_MAP,
  FREE_REASON_MAP,
  TIME_SLOT_MAP,
  VEHICLE_TYPE_MAP,
} from '../../constants/booking'
import QueryFilterPanel, {
  QueryFilterActions,
  QueryFilterItem,
} from '../../components/QueryFilterPanel'
import OrderDetailDrawer from './components/OrderDetailDrawer'

export default function OrdersPage() {
  const [form] = Form.useForm()
  const [data, setData] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 })
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<Booking | null>(null)
  const [queryParams, setQueryParams] = useState<BookingQueryParams>({ page: 1, pageSize: 10 })

  const fetchData = useCallback(async (params: BookingQueryParams) => {
    setLoading(true)
    try {
      const res = await getBookings(params)
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
    const params: BookingQueryParams = {
      page: 1,
      pageSize: pagination.pageSize,
    }
    if (values.bookingDate) params.bookingDate = dayjs(values.bookingDate).format('YYYY-MM-DD')
    if (values.createdRange && values.createdRange.length === 2) {
      params.createdStart = values.createdRange[0].format('YYYY-MM-DD')
      params.createdEnd = values.createdRange[1].format('YYYY-MM-DD')
    }
    if (values.status) params.status = values.status
    if (values.keyword) params.keyword = values.keyword
    setQueryParams(params)
  }

  const handleReset = () => {
    form.resetFields()
    setQueryParams({ page: 1, pageSize: 10 })
  }

  const handleTableChange = (page: number, pageSize: number) => {
    setQueryParams((prev) => ({ ...prev, page, pageSize }))
  }

  const handleViewDetail = (record: Booking) => {
    setCurrentRecord(record)
    setDetailVisible(true)
  }

  const handleExport = async () => {
    message.loading({ content: '正在导出...', key: 'export' })
    try {
      const exportParams: BookingQueryParams = { ...queryParams }
      delete exportParams.page
      delete exportParams.pageSize
      const blob = await exportBookings(exportParams); // 现在类型是 Blob
      console.log(blob)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `订单导出_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      message.success({ content: '导出成功', key: 'export' })
    } catch(error) {
        console.log(error)
    //   message.error({ content: '导出失败', key: 'export' })
    }
  }

  const columns: ColumnsType<Booking> = [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 90,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 130,
    },
    {
      title: '预约日期',
      dataIndex: 'bookingDate',
      width: 120,
    },
    {
      title: '时间段',
      dataIndex: 'timeSlot',
      width: 80,
      render: (v: TimeSlot) => TIME_SLOT_MAP[v] ?? v,
    },
    {
      title: '车辆类型',
      dataIndex: 'vehicleType',
      width: 100,
      render: (v: Booking['vehicleType']) => {
        const t = v ? VEHICLE_TYPE_MAP[v] : null
        return t ? <Tag color={t.color}>{t.label}</Tag> : '-'
      },
    },
    {
      title: '人数',
      dataIndex: 'personCount',
      width: 70,
    },
    {
      title: '是否免费',
      dataIndex: 'isFree',
      width: 100,
      render: (isFree: boolean | undefined, record: Booking) => {
        if (!isFree) return <span style={{ color: '#999' }}>收费</span>
        const r = record.freeReason ? FREE_REASON_MAP[record.freeReason] : undefined
        return r ? <Tag color={r.color}>{r.label}</Tag> : <Tag color="green">免费</Tag>
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 90,
      render: (amount: number | null | undefined, record: Booking) => {
        if (record.isFree) return <span style={{ color: '#52c41a' }}>¥0.00</span>
        if (amount == null) return '-'
        return `¥${(amount / 100).toFixed(2)}`
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: BookingStatus) => {
        const s = STATUS_MAP[v]
        return s ? <Tag color={s.tagColor}>{s.label}</Tag> : v
      },
    },
    {
      // 核销留痕（bookings.verifiedAt / verifiedBy）。**只有 completed 有值**——
      // 唯一写入方是核销员扫码，定时任务只写 expiredAt，不碰这里。
      // 所以「已完成但核销时间空」= 数据异常，这一列就是拿来区分这个的。
      title: '核销时间',
      dataIndex: 'verifiedAt',
      width: 175,
      render: (v: string | null | undefined, record: Booking) => {
        if (!v) {
          // 「已完成但没有留痕」只可能是**留痕字段上线之前**核销的订单
          // （`status=completed` 的有效写入方只有 `markVerified`，它必写这两个字段）。
          // 直接显示 '-' 会让人以为是前端没渲染，所以说清楚。
          if (record.status === 'completed') {
            return (
              <Tooltip title="核销留痕是后加的字段，该单在此之前就已核销">
                <span style={{ color: '#bbb' }}>无留痕</span>
              </Tooltip>
            )
          }
          return '-'
        }
        // 姓名解析不到时回落显示 openid（28 位，会溢出，所以截断 + hover 出全文）——
        // 后台是追责场景，有原始标识好过显示一个「未知」
        const verifier = record.verifiedByName || record.verifiedBy || '—'
        return (
          <div>
            <div>{dayjs(v).format('YYYY-MM-DD HH:mm')}</div>
            <div
              title={verifier}
              style={{ fontSize: 12, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              核销人：{verifier}
            </div>
          </div>
        )
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>订单查询</h2>
        <Button icon={<ExportOutlined />} onClick={handleExport}>
          导出 Excel
        </Button>
      </div>

      {/* 筛选区 */}
      <QueryFilterPanel form={form} columns={4}>
        <QueryFilterItem name="bookingDate" label="预约日期">
          <DatePicker placeholder="选择日期" />
        </QueryFilterItem>
        <QueryFilterItem name="createdRange" label="创建日期" wide>
          <DatePicker.RangePicker placeholder={['开始', '结束']} />
        </QueryFilterItem>
        <QueryFilterItem name="status" label="订单状态">
          <Select mode="multiple" placeholder="全部状态" allowClear maxTagCount="responsive">
            {Object.entries(STATUS_MAP).map(([key, val]) => (
              <Select.Option key={key} value={key}>
                {val.label}
              </Select.Option>
            ))}
          </Select>
        </QueryFilterItem>
        <QueryFilterItem name="keyword" label="关键字" wide>
          <Input placeholder="姓名 / 手机号 / 订单号" allowClear />
        </QueryFilterItem>
        <QueryFilterActions>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </QueryFilterActions>
      </QueryFilterPanel>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 900, y: 'calc(100vh - 390px)' }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (t) => `共 ${t} 条`,
          showSizeChanger: true,
          onChange: handleTableChange,
        }}
      />

      <OrderDetailDrawer
        open={detailVisible}
        record={currentRecord}
        onClose={() => setDetailVisible(false)}
      />
    </>
  )
}
