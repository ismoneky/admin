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
import * as XLSX from 'xlsx'
import { getBookings } from '../../api/bookings'
import type { Booking, BookingQueryParams, TimeSlot, BookingStatus } from '../../types'

const TIME_SLOT_MAP: Record<TimeSlot, string> = {
  morning: '上午',
  afternoon: '下午',
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
  const [queryParams, setQueryParams] = useState<BookingQueryParams>({ page: 1, pageSize: 20 })

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
    if (values.timeSlot) params.timeSlot = values.timeSlot
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
      // 获取全量数据
      const res = await getBookings({ ...queryParams, page: 1, pageSize: 9999 })
      if (!res.success) return

      const rows = res.data.map((item) => ({
        订单ID: item.id,
        姓名: item.name,
        手机号: item.phone,
        身份证号: item.idCard,
        预约日期: item.bookingDate,
        时间段: TIME_SLOT_MAP[item.timeSlot] ?? item.timeSlot,
        出行方式: TRAVEL_MODE_MAP[item.travelMode as keyof typeof TRAVEL_MODE_MAP] ?? item.travelMode,
        车牌号: item.licensePlate ?? '',
        车辆类型: item.vehicleType ? (VEHICLE_TYPE_MAP[item.vehicleType]?.label ?? item.vehicleType) : '',
        旅游团名称: item.tourGroupName ?? '',
        旅游团订单号: item.tourOrderNumber ?? '',
        预约人数: item.personCount,
        订单状态: STATUS_MAP[item.status]?.label ?? item.status,
        备注: item.remarks ?? '',
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '订单列表')
      XLSX.writeFile(wb, `订单列表_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)
      message.success({ content: '导出成功', key: 'export' })
    } catch {
      message.error({ content: '导出失败', key: 'export' })
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
        <Form.Item name="timeSlot" label="时间段">
          <Select placeholder="全部" style={{ width: 100 }} allowClear>
            <Select.Option value="morning">上午</Select.Option>
            <Select.Option value="afternoon">下午</Select.Option>
          </Select>
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
        scroll={{ x: 900 }}
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
            <Descriptions.Item label="订单ID" span={2}>{currentRecord.id}</Descriptions.Item>
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
            <Descriptions.Item label="预约人数">{currentRecord.personCount} 人</Descriptions.Item>
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
