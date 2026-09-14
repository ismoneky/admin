import { useState } from 'react'
import { Button, Card, Alert, Descriptions, Space, Popconfirm, Tag, InputNumber } from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { runExpireScan, runDailyReminder } from '../../api/tasks'
import type { ExpireScanResult, DailyReminderResult } from '../../types'

/**
 * 定时任务手动触发
 *
 * ── 这个页面解决什么 ──────────────────────────────────────────────────────
 * 两个扫描任务平时只能等 cron（过期扫描每小时 :13，每日提醒每天 22:00），
 * 要验一次得掐着表。给管理员一个「立刻跑一次」的按钮，测试和事故补扫都用它。
 *
 * ── 它不是「后门」────────────────────────────────────────────────────────
 * 后端调的就是 cron 调用的那个方法：静默期、去重键、单轮 200 条上限、重入锁
 * 全部照旧。手动执行能改的只有**时机**——所以两个卡片的说明里都写明了
 * 「这一轮到底会做什么」，操作者看着说明按，而不是靠记忆。
 *
 * ⚠️ 两个按钮都有真实副作用（改订单状态 + 给真实用户发站内信），
 * 所以都套了 Popconfirm。**不要为了省一次点击把它们去掉。**
 */

/** 一次手动执行的结果快照；`at` 由前端盖章，后端不回传执行时刻 */
interface RunSnapshot<T> {
  at: string
  data: T
}

const stamp = () => dayjs().format('YYYY-MM-DD HH:mm:ss')

/** 与后端 A 规则一致的默认值（`MESSAGE_QUIET_WINDOW_MS` = 2 小时） */
const DEFAULT_QUIET_MINUTES = 120

/** 与后端 DTO 的 `@Max` 一致（`MESSAGE_QUIET_WINDOW_MAX_MS` = 24 小时） */
const MAX_QUIET_MINUTES = 24 * 60

/**
 * 静默期输入（两张卡共用）
 *
 * 后端只有手动触发接口认这个参数，cron 路径永远是 2 小时——所以这里的改动
 * **只影响点下按钮的那一次**，不是把 A 规则改松。
 */
function QuietWindowField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Space align="center" style={{ marginBottom: 12 }} wrap>
      <span>静默期</span>
      <InputNumber
        min={0}
        max={MAX_QUIET_MINUTES}
        value={value}
        onChange={(v) => onChange(typeof v === 'number' ? v : 0)}
        addonAfter="分钟"
        style={{ width: 170 }}
      />
      {value === 0 ? (
        <span style={{ color: '#ff4d4f', fontSize: 12 }}>
          0 = 不设静默期，刚下单的用户也会立刻收到消息（仅测试用）
        </span>
      ) : (
        <span style={{ color: '#999', fontSize: 12 }}>
          默认 {DEFAULT_QUIET_MINUTES} 分钟（A 规则：下单 2 小时内不推送）
        </span>
      )}
    </Space>
  )
}

export default function TasksPage() {
  const [expireRunning, setExpireRunning] = useState(false)
  const [dailyRunning, setDailyRunning] = useState(false)
  const [expireSnap, setExpireSnap] = useState<RunSnapshot<ExpireScanResult> | null>(null)
  const [dailySnap, setDailySnap] = useState<RunSnapshot<DailyReminderResult> | null>(null)
  // 静默期（分钟）：默认 2 小时，测试时改成 0 就不必再干等
  const [expireQuiet, setExpireQuiet] = useState(DEFAULT_QUIET_MINUTES)
  const [dailyQuiet, setDailyQuiet] = useState(DEFAULT_QUIET_MINUTES)

  // 失败（非 2xx）由 request 拦截器统一弹 message.error，这里只处理成功分支
  const handleExpire = async () => {
    setExpireRunning(true)
    try {
      const res = await runExpireScan(expireQuiet)
      if (res.success && res.data) setExpireSnap({ at: stamp(), data: res.data })
    } finally {
      setExpireRunning(false)
    }
  }

  const handleDaily = async () => {
    setDailyRunning(true)
    try {
      const res = await runDailyReminder(dailyQuiet)
      if (res.success && res.data) setDailySnap({ at: stamp(), data: res.data })
    } finally {
      setDailyRunning(false)
    }
  }

  return (
    <div style={{ maxWidth: 880 }}>
      <h2 style={{ margin: '0 0 16px' }}>定时任务</h2>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="这两个任务平时由后端自动执行，这里只解决「不想等到点」"
        description={
          <span>
            手动执行调的是后端定时任务<b>同一个方法</b>，不会绕过任何规则：下单不满 2 小时的静默期、
            已发过消息的去重、单轮 200 条上限，照样生效——能改的只有执行时机。
            积压的订单多时一轮消化不完，要连点几次。
          </span>
        }
      />

      {/* ── 过期扫描（T1）──────────────────────────────────────────────── */}
      <Card
        title={
          <Space>
            <span>过期扫描</span>
            <Tag color="blue">自动执行：每小时 :13</Tag>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <div style={{ lineHeight: 1.9, marginBottom: 16 }}>
          把「预约日期已过、仍未核销」的订单置为<b>已过期</b>，并给订单本人发一条
          「订单已过期，可申请退款」的站内信。
        </div>
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="会真实修改订单状态，并给对应用户发消息"
          description="退款中/已退款、已核销、待支付的订单不会被扫到；预约日期是今天的也不会——判据是严格早于今天。"
        />
        <QuietWindowField value={expireQuiet} onChange={setExpireQuiet} />
        <Popconfirm
          title="确认立刻执行一次过期扫描？"
          description={`会修改订单状态并给对应用户发送站内信，无法撤回。本次静默期 ${expireQuiet} 分钟。`}
          okText="执行"
          cancelText="取消"
          onConfirm={handleExpire}
        >
          <Button type="primary" icon={<PlayCircleOutlined />} loading={expireRunning}>
            立即执行
          </Button>
        </Popconfirm>

        {expireSnap && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type={expireSnap.data.error ? 'error' : expireSnap.data.skipped ? 'warning' : 'success'}
              showIcon
              style={{ marginBottom: 12 }}
              message={
                expireSnap.data.error
                  ? '执行失败'
                  : expireSnap.data.skipped
                    ? '上一轮尚未结束，本次未执行'
                    : '执行完成'
              }
              description={expireSnap.data.error ?? undefined}
            />
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="执行时刻">{expireSnap.at}</Descriptions.Item>
              <Descriptions.Item label="静默期">{expireSnap.data.quietWindowMinutes} 分钟</Descriptions.Item>
              <Descriptions.Item label="转入过期">{expireSnap.data.expiredCount} 单</Descriptions.Item>
              <Descriptions.Item label="发出通知">{expireSnap.data.notifiedCount} 条</Descriptions.Item>
              <Descriptions.Item label="本轮被跳过">{expireSnap.data.skipped ? '是' : '否'}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Card>

      {/* ── 每日提醒（T2）──────────────────────────────────────────────── */}
      <Card
        title={
          <Space>
            <span>每日提醒</span>
            <Tag color="blue">自动执行：每天 22:00</Tag>
          </Space>
        }
      >
        <div style={{ lineHeight: 1.9, marginBottom: 16 }}>
          一次扫描做两件事：① 给「今天已预约、还没核销」的用户发核销提醒；
          ② 给「近 7 天已过期、且没申请退款」的用户补发一条可退款提醒。
        </div>
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="白天或凌晨执行会打扰用户，请只在测试环境用"
          description={
            <span>
              ① 的文案是「今天快结束了，请尽快核销」——22:00 说这句话是提醒，
              下午或凌晨说同一句话就是打扰。后端不会拦这个时机，靠操作的人自觉。
            </span>
          }
        />
        <QuietWindowField value={dailyQuiet} onChange={setDailyQuiet} />
        <Popconfirm
          title="确认立刻执行一次每日提醒？"
          description={`会给当天已预约未核销的用户发送「请尽快核销」的站内信。本次静默期 ${dailyQuiet} 分钟。`}
          okText="执行"
          cancelText="取消"
          onConfirm={handleDaily}
        >
          <Button type="primary" icon={<PlayCircleOutlined />} loading={dailyRunning}>
            立即执行
          </Button>
        </Popconfirm>

        {dailySnap && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type={dailySnap.data.error ? 'error' : dailySnap.data.skipped ? 'warning' : 'success'}
              showIcon
              style={{ marginBottom: 12 }}
              message={
                dailySnap.data.error
                  ? '执行失败'
                  : dailySnap.data.skipped
                    ? '上一轮尚未结束，本次未执行'
                    : '执行完成'
              }
              description={dailySnap.data.error ?? undefined}
            />
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="执行时刻">{dailySnap.at}</Descriptions.Item>
              <Descriptions.Item label="静默期">{dailySnap.data.quietWindowMinutes} 分钟（只作用于核销提醒）</Descriptions.Item>
              <Descriptions.Item label="本轮被跳过">{dailySnap.data.skipped ? '是' : '否'}</Descriptions.Item>
              <Descriptions.Item label="今天未核销">
                扫到 {dailySnap.data.todayPendingCount} 单 / 发出 {dailySnap.data.remindedCount} 条
              </Descriptions.Item>
              <Descriptions.Item label="过期可退款">
                扫到 {dailySnap.data.expiredPendingCount} 单 / 发出 {dailySnap.data.recalledCount} 条
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Card>
    </div>
  )
}
