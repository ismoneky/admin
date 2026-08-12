import { useCallback, useEffect, useRef, useState } from 'react'
import { DatePicker, Radio, Space, Spin, message } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { getBookingDashboard } from '../../api/dashboard'
import type { BookingDashboardResponse } from '../../types'
import SummaryCards from './components/SummaryCards'
import DailyTrendChart from './components/DailyTrendChart'
import DistributionPanels from './components/DistributionPanels'
import DailyDetailTable from './components/DailyDetailTable'

const { RangePicker } = DatePicker

type Preset = 'today' | 'yesterday' | 'last7' | 'month' | 'custom'

/** 生成 YYYY-MM-DD，不传时间戳给后端 */
function fmt(d: Dayjs): string {
  return d.format('YYYY-MM-DD')
}

export default function DashboardPage() {
  // 默认"今日"
  const [preset, setPreset] = useState<Preset>('today')
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs()])
  const [data, setData] = useState<BookingDashboardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  // 请求序号：快速切换时丢弃过期请求结果
  const seqRef = useRef(0)

  const loadDashboard = useCallback(async (startDate: string, endDate: string) => {
    const seq = ++seqRef.current
    setLoading(true)
    setError(false)
    try {
      const res = await getBookingDashboard({ startDate, endDate })
      // 过期请求结果丢弃，保证 UI 对应最新范围
      if (seq !== seqRef.current) return
      if (res.success && res.data) {
        setData(res.data)
      } else {
        setError(true)
        message.error('统计数据加载失败，请重试')
      }
    } catch {
      if (seq !== seqRef.current) return
      setError(true)
      message.error('统计数据加载失败，请重试')
    } finally {
      if (seq === seqRef.current) setLoading(false)
    }
  }, [])

  // 首次加载立即请求"今日"
  useEffect(() => {
    loadDashboard(fmt(dayjs()), fmt(dayjs()))
  }, [loadDashboard])

  const applyPreset = (p: Preset) => {
    setPreset(p)
    const today = dayjs()
    let next: [Dayjs, Dayjs]
    switch (p) {
      case 'today':
        next = [today, today]
        break
      case 'yesterday':
        next = [today.subtract(1, 'day'), today.subtract(1, 'day')]
        break
      case 'last7':
        // 含今天在内向前 7 个自然日
        next = [today.subtract(6, 'day'), today]
        break
      case 'month': {
        const start = today.startOf('month')
        const end = today.endOf('month')
        next = [start, end]
        break
      }
      default:
        return // custom 由 RangePicker 触发
    }
    setRange(next)
    loadDashboard(fmt(next[0]), fmt(next[1]))
  }

  const handleRangeChange = (values: [Dayjs | null, Dayjs | null] | null) => {
    if (!values || !values[0] || !values[1]) return
    setPreset('custom')
    setRange([values[0], values[1]])
    // 自定义范围只在起止日期都选择后请求
    loadDashboard(fmt(values[0]), fmt(values[1]))
  }

  return (
    <div style={{height: '82vh', overflow: 'hidden', overflowY: 'auto'}}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space wrap>
          <Radio.Group value={preset} onChange={(e) => applyPreset(e.target.value as Preset)}>
            <Radio.Button value="today">今日</Radio.Button>
            <Radio.Button value="yesterday">昨日</Radio.Button>
            <Radio.Button value="last7">最近 7 天</Radio.Button>
            <Radio.Button value="month">本月</Radio.Button>
            <Radio.Button value="custom">自定义</Radio.Button>
          </Radio.Group>
          <RangePicker
            value={range}
            onChange={handleRangeChange}
            allowClear={false}
          />
        </Space>

        <Spin spinning={loading}>
          {/* 失败时保留上一次成功数据；无历史数据时组件内部展示空态/0 */}
          <div style={{ opacity: loading && data ? 0.6 : 1 }}>
            {data ? (
              <>
                <SummaryCards summary={data.summary} />
                <DailyTrendChart dailyTrend={data.dailyTrend} />
                <DistributionPanels
                  statusDistribution={data.statusDistribution}
                  travelModeDistribution={data.travelModeDistribution}
                />
                <DailyDetailTable dailyTrend={data.dailyTrend} />
              </>
            ) : !loading && error ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
                暂无数据，请重试
              </div>
            ) : null}
          </div>
        </Spin>
      </Space>
    </div>
  )
}
