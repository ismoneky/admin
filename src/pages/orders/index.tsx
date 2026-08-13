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
  Modal,
  Descriptions,
  message,
} from 'antd'
import { SearchOutlined, ReloadOutlined, ExportOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { getBookings, exportBookings } from '../../api/bookings'
import type { Booking, BookingQueryParams, TimeSlot, BookingStatus, Passenger } from '../../types'
import {
  normalizePassengerForDisplay,
  getPassengerTypeLabel,
  getAgeFreeStatusText,
  maskIdCardText,
} from '../../utils/passenger'

function parsePassengers(passengers: string | Passenger[] | undefined): Passenger[] {
  if (!passengers) return []
  if (Array.isArray(passengers)) return passengers
  try { return JSON.parse(passengers) } catch { return [] }
}

const TIME_SLOT_MAP: Record<TimeSlot, string> = {
  morning: '上午',
  afternoon: '下午',
}

/** 免费来源映射（freeReason） */
const FREE_REASON_MAP: Record<string, { label: string; color: string }> = {
  member: { label: '会员免费', color: 'gold' },
  dailyQuota: { label: '每日免费', color: 'cyan' },
  age: { label: '年龄免费', color: 'green' },
}

const TRAVEL_MODE_MAP = {
  scenicBus: '景区大巴',
  selfDriving: '自驾',
  tourGroup: '旅游团',
}

const VEHICLE_TYPE_MAP: Record<string, { label: string; color: string }> = {
  wheelMotorcycle: { label: '摩托车', color: 'volcano' },
  smallCar: { label: '小客车', color: 'geekblue' },
}

const STATUS_MAP: Record<BookingStatus, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'orange' },
  confirmed: { label: '已支付', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'red' },
  refunded: { label: '已退款', color: 'purple' },
}

export default function OrdersPage() {
  const [form] = Form.useForm()
  const [data, setData] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 })
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<Booking | null>(null)
  const [queryParams, setQueryParams] = useState<BookingQueryParams>({ page: 1, pageSize: 10 })

  // 详情弹窗的人员快照（旧订单按 2.2 默认值归一化，不重新计算年龄）
  const displayPassengers = currentRecord
    ? parsePassengers(currentRecord.passengers).map((p) => normalizePassengerForDisplay(p, currentRecord))
    : []
  const freePeopleCount = displayPassengers.filter((p) => !p.finalCharged).length
  const chargedPeopleCount = displayPassengers.filter((p) => p.finalCharged).length

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
      render: (v: string) => {
        const t = VEHICLE_TYPE_MAP[v]
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
        return s ? <Tag color={s.color}>{s.label}</Tag> : v
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
      <Form form={form} layout="inline" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Form.Item name="bookingDate" label="预约日期">
          <DatePicker placeholder="选择日期" />
        </Form.Item>
        <Form.Item name="createdRange" label="创建日期">
          <DatePicker.RangePicker placeholder={['开始', '结束']} style={{ width: 240 }} />
        </Form.Item>
        <Form.Item name="status" label="订单状态">
          <Select mode="multiple" placeholder="全部" style={{ minWidth: 160 }} allowClear maxTagCount="responsive">
            {Object.entries(STATUS_MAP).map(([key, val]) => (
              <Select.Option key={key} value={key}>
                {val.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="keyword" label="关键字">
          <Input placeholder="姓名 / 手机号 / 订单号" style={{ width: 200 }} allowClear />
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

      {/* 详情弹窗 */}
      <Modal
        title="订单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {currentRecord && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="商户订单ID" span={2}>{currentRecord.outTradeNo}</Descriptions.Item>
            <Descriptions.Item label="姓名">{currentRecord.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{currentRecord.phone}</Descriptions.Item>
            <Descriptions.Item label="身份证号" span={2}>{currentRecord.idCard}</Descriptions.Item>
            <Descriptions.Item label="预约日期">{currentRecord.bookingDate}</Descriptions.Item>
            <Descriptions.Item label="时间段">
              {TIME_SLOT_MAP[currentRecord.timeSlot] ?? currentRecord.timeSlot}
            </Descriptions.Item>
            <Descriptions.Item label="出行方式">
              {TRAVEL_MODE_MAP[currentRecord.travelMode as keyof typeof TRAVEL_MODE_MAP] ?? currentRecord.travelMode}
            </Descriptions.Item>
            <Descriptions.Item label="预约人数">
              {currentRecord.personCount} 人
              {displayPassengers.length > 0 && (
                <span style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>
                  （免费 {freePeopleCount} 人 · 收费 {chargedPeopleCount} 人）
                </span>
              )}
            </Descriptions.Item>
            {displayPassengers.length > 0 && (
              <Descriptions.Item label="出行人员" span={2}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {displayPassengers.map((p, i) => (
                    <div key={i} style={{ padding: '8px 12px', background: '#f7f8fd', borderRadius: 6, fontSize: 13 }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{getPassengerTypeLabel(p.passengerType, i)}：</span>
                        <span>{p.name}</span>
                        <span style={{ marginLeft: 16, color: '#666' }}>{p.phone}</span>
                        <span style={{ marginLeft: 16, color: '#999' }}>{maskIdCardText(p.idCard)}</span>
                      </div>
                      {/* 计费状态：年龄免费（绿）/ 未提供身份证（黄）/ 整单免费 / 正常收费 */}
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {getAgeFreeStatusText(p) && <Tag color="green">{getAgeFreeStatusText(p)}</Tag>}
                        {p.idCardUnavailable && (
                          <Tag color="gold">未提供身份证号 · 按正常价格收费 · 暂时无法投保</Tag>
                        )}
                        {!p.ageFree && !p.idCardUnavailable && !p.finalCharged && <Tag color="green">整单免费</Tag>}
                        {!p.ageFree && !p.idCardUnavailable && p.finalCharged && <Tag>正常收费</Tag>}
                      </div>
                    </div>
                  ))}
                </div>
              </Descriptions.Item>
            )}
            {currentRecord.licensePlate && (
              <Descriptions.Item label="车牌号">{currentRecord.licensePlate}</Descriptions.Item>
            )}
            {currentRecord.vehicleType && (
              <Descriptions.Item label="车辆类型">
                {VEHICLE_TYPE_MAP[currentRecord.vehicleType]
                  ? <Tag color={VEHICLE_TYPE_MAP[currentRecord.vehicleType].color}>{VEHICLE_TYPE_MAP[currentRecord.vehicleType].label}</Tag>
                  : currentRecord.vehicleType}
              </Descriptions.Item>
            )}
            {currentRecord.tourGroupName && (
              <Descriptions.Item label="旅游团名称">{currentRecord.tourGroupName}</Descriptions.Item>
            )}
            {currentRecord.tourOrderNumber && (
              <Descriptions.Item label="旅游团订单号">{currentRecord.tourOrderNumber}</Descriptions.Item>
            )}
            <Descriptions.Item label="订单状态">
              {STATUS_MAP[currentRecord.status] ? (
                <Tag color={STATUS_MAP[currentRecord.status].color}>
                  {STATUS_MAP[currentRecord.status].label}
                </Tag>
              ) : currentRecord.status}
            </Descriptions.Item>
            <Descriptions.Item label="是否免费">
              {currentRecord.isFree
                ? (currentRecord.freeReason && FREE_REASON_MAP[currentRecord.freeReason]
                    ? <Tag color={FREE_REASON_MAP[currentRecord.freeReason].color}>{FREE_REASON_MAP[currentRecord.freeReason].label}</Tag>
                    : <Tag color="green">免费</Tag>)
                : <span style={{ color: '#999' }}>收费</span>}
            </Descriptions.Item>
            <Descriptions.Item label="金额">
              {currentRecord.isFree
                ? <span style={{ color: '#52c41a' }}>¥0.00</span>
                : (currentRecord.amount != null ? `¥${(currentRecord.amount / 100).toFixed(2)}` : '-')}
            </Descriptions.Item>
            <Descriptions.Item label="微信OpenID">{currentRecord.wechatOpenId}</Descriptions.Item>
            {currentRecord.remarks && (
              <Descriptions.Item label="备注" span={2}>{currentRecord.remarks}</Descriptions.Item>
            )}
            <Descriptions.Item label="创建时间">
              {dayjs(currentRecord.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(currentRecord.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  )
}
