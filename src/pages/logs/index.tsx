import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { getLogStats, queryLogs } from '../../api/logs'
import type { AppLog, LogCategory, LogLevel, LogQueryParams, LogSource, LogStats } from '../../types'

/**
 * 日志查询（`GET /admin/logs`）
 *
 * ── 这张表里有什么、没有什么 ──────────────────────────────────────────────
 * 有：走 `LoggingService.write()` 的**结构化业务日志**——下单、支付回调、核销、
 * 审核、异常留痕、以及小程序上报的客户端日志。这是排查业务问题的主战场。
 *
 * 没有：Nest `Logger` 的输出（启动过程、框架层报错、看门狗告警）。那些只到 stdout，
 * 进的是 pm2 的日志文件。**在这里搜不到不等于没发生**，别被这一点误导。
 *
 * ── 30 天是硬边界 ─────────────────────────────────────────────────────────
 * 每天 03:21 清理 30 天前的行。查更早的时间段不是"查询失败"，是数据已经不在了。
 * 所以页面上把这句话写在顶部，免得有人以为是筛选条件写错了。
 */

const SOURCE_MAP: Record<LogSource, { label: string; color: string }> = {
  backend: { label: '后端', color: 'geekblue' },
  miniprogram: { label: '小程序', color: 'green' },
  admin: { label: '管理端', color: 'purple' },
}

const LEVEL_MAP: Record<LogLevel, { label: string; color: string }> = {
  debug: { label: 'DEBUG', color: 'default' },
  info: { label: 'INFO', color: 'blue' },
  warn: { label: 'WARN', color: 'orange' },
  error: { label: 'ERROR', color: 'red' },
}

const CATEGORY_MAP: Record<LogCategory, string> = {
  request: '请求',
  booking: '预约',
  payment: '支付',
  network: '网络',
  ui: '界面',
  runtime: '运行时',
}

const DEFAULT_PAGE_SIZE = 20

export default function LogsPage() {
  const [form] = Form.useForm()
  const [data, setData] = useState<AppLog[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<LogStats | null>(null)
  const [pagination, setPagination] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })
  const [queryParams, setQueryParams] = useState<LogQueryParams>({ page: 1, pageSize: DEFAULT_PAGE_SIZE })

  const fetchData = useCallback(async (params: LogQueryParams) => {
    setLoading(true)
    try {
      const res = await queryLogs(params)
      if (res.success && res.data) {
        setData(res.data.logs)
        setPagination({
          page: res.data.page,
          pageSize: res.data.pageSize,
          total: res.data.total,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(queryParams)
  }, [queryParams, fetchData])

  // 统计只吃日期范围（后端如此），所以只在时间变化时重算，切来源/级别不重算
  useEffect(() => {
    getLogStats({ start: queryParams.start, end: queryParams.end })
      .then((res) => {
        if (res.success && res.data) setStats(res.data)
      })
      .catch(() => {
        // 统计是附属信息，失败不打断列表；错误提示由 request 拦截器统一弹
      })
  }, [queryParams.start, queryParams.end])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const params: LogQueryParams = { page: 1, pageSize: pagination.pageSize }
    if (values.source) params.source = values.source
    if (values.level) params.level = values.level
    if (values.category) params.category = values.category
    if (values.keyword) params.keyword = values.keyword
    if (values.range && values.range.length === 2) {
      params.start = values.range[0].format('YYYY-MM-DD')
      params.end = values.range[1].format('YYYY-MM-DD')
    }
    setQueryParams(params)
  }

  const handleReset = () => {
    form.resetFields()
    setQueryParams({ page: 1, pageSize: DEFAULT_PAGE_SIZE })
  }

  const handleTableChange = (page: number, pageSize: number) => {
    setQueryParams((prev) => ({ ...prev, page, pageSize }))
  }

  const columns: ColumnsType<AppLog> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: number) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '级别',
      dataIndex: 'level',
      width: 90,
      render: (v: LogLevel) => <Tag color={LEVEL_MAP[v]?.color}>{LEVEL_MAP[v]?.label ?? v}</Tag>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 90,
      render: (v: LogSource) => <Tag color={SOURCE_MAP[v]?.color}>{SOURCE_MAP[v]?.label ?? v}</Tag>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 90,
      render: (v: LogCategory) => CATEGORY_MAP[v] ?? v,
    },
    {
      title: '消息',
      dataIndex: 'message',
      ellipsis: { showTitle: false },
      render: (v: string) => (
        <Tooltip title={v} placement="topLeft">
          <span>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: '路由 / 路径',
      dataIndex: 'route',
      width: 220,
      ellipsis: { showTitle: false },
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v} placement="topLeft">
            <span>{v}</span>
          </Tooltip>
        ) : (
          '-'
        ),
    },
  ]

  /** 展开行：上下文的完整内容。contextJson 入库前已由后端做过敏感字段过滤 */
  const expandedRowRender = (record: AppLog) => {
    let ctx = record.contextJson ?? ''
    try {
      ctx = JSON.stringify(JSON.parse(ctx), null, 2)
    } catch {
      // 不是 JSON 就原样展示，不因为格式化失败把内容吞掉
    }
    return (
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="logId" span={2}>
          {record.logId}
        </Descriptions.Item>
        <Descriptions.Item label="requestId">{record.requestId ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="sessionId">{record.sessionId ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="客户端版本">{record.appVersion ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="平台">{record.platform ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="客户端时间" span={2}>
          {record.clientCreatedAt ? dayjs(record.clientCreatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="上下文" span={2}>
          <pre style={{ margin: 0, maxHeight: 260, overflow: 'auto', fontSize: 12 }}>{ctx || '-'}</pre>
        </Descriptions.Item>
      </Descriptions>
    )
  }

  const bySourceEntries = Object.entries(stats?.bySource ?? {})

  return (
    <div>
      <h2 style={{ margin: '0 0 16px' }}>日志查询</h2>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="只保留 30 天；且只有结构化业务日志"
        description={
          <span>
            日志存在独立的 <b>logs.db</b>，每天 03:21 清理 30 天前的记录——更早的时间段查不到是正常的，
            不是筛选条件的问题。
            另外这里<b>不含</b>后端进程的 stdout 日志（启动过程、框架层报错、看门狗告警），
            那些在服务器的 pm2 日志文件里。
          </span>
        }
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="总数" value={stats?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="错误" value={stats?.recentErrors ?? 0} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="警告" value={stats?.byLevel?.warn ?? 0} valueStyle={{ color: '#d46b08' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <div style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.45)' }}>来源分布</div>
            <div style={{ marginTop: 8 }}>
              {bySourceEntries.length > 0 ? (
                bySourceEntries.map(([k, v]) => (
                  <Tag key={k}>
                    {SOURCE_MAP[k as LogSource]?.label ?? k}: {v}
                  </Tag>
                ))
              ) : (
                <span style={{ color: '#bbb' }}>—</span>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Form form={form} layout="inline" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Form.Item name="source" label="来源">
          <Select placeholder="全部" style={{ minWidth: 120 }} allowClear>
            {Object.entries(SOURCE_MAP).map(([key, val]) => (
              <Select.Option key={key} value={key}>
                {val.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="level" label="级别">
          <Select placeholder="全部" style={{ minWidth: 120 }} allowClear>
            {Object.entries(LEVEL_MAP).map(([key, val]) => (
              <Select.Option key={key} value={key}>
                {val.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="category" label="分类">
          <Select placeholder="全部" style={{ minWidth: 120 }} allowClear>
            {Object.entries(CATEGORY_MAP).map(([key, val]) => (
              <Select.Option key={key} value={key}>
                {val}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="range" label="时间范围">
          <DatePicker.RangePicker placeholder={['开始', '结束']} style={{ width: 'min(240px, calc(100vw - 48px))' }} />
        </Form.Item>
        <Form.Item name="keyword" label="关键字">
          <Input
            placeholder="消息 / 路由 / logId"
            style={{ width: 'min(200px, calc(100vw - 48px))' }}
            allowClear
            onPressEnter={handleSearch}
          />
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
        expandable={{ expandedRowRender }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (t) => `共 ${t} 条`,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          onChange: handleTableChange,
        }}
      />
    </div>
  )
}
