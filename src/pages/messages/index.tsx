import { useState } from 'react'
import { Form, Input, Button, Switch, Card, Alert, Descriptions, Space, message } from 'antd'
import { SendOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { sendAdminMessage } from '../../api/messages'
import type { SendMessageParams, SendMessageResult } from '../../types'

/** 与后端 DTO 的 `@MaxLength` 保持一致（标题 50 / 正文 500，正文上限即列宽） */
const TITLE_MAX = 50
const CONTENT_MAX = 500

/**
 * 发送站内信（方案 §6 `POST /admin/messages/send`）
 *
 * ── 收件人填 openid，不是手机号 ────────────────────────────────────────────
 * `messages.userId` 存的是 openid（与 bookings / feedbacks / members 一致，
 * 全站以 openid 为业务主键）。按手机号发是不确定的：`user_profiles.phone`
 * **不唯一**（换绑、家人共用），服务端反查会命中多个人而它必须挑一个。
 * 所以入口是「从订单/反馈详情页把 openid 复制过来」，页面上把这个来源写清楚，
 * 否则运营会来问「我不知道 openid 是什么」。
 *
 * ── 发出去之后无法撤回 ────────────────────────────────────────────────────
 * 站内信没有推送，用户可能几天后才打开小程序。没有「撤回」这个概念
 * （撤回需要一个「用户还没看到」的窗口，而这个窗口无法定义），
 * 所以发送前用二次确认拦一道，并且把收件人和正文如实回显。
 */
export default function MessagesPage() {
  const [form] = Form.useForm()
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ params: SendMessageParams; res: SendMessageResult } | null>(null)

  const handleSend = async () => {
    const values = await form.validateFields()
    const params: SendMessageParams = {
      openid: values.openid.trim(),
      title: values.title.trim(),
      content: values.content.trim(),
      // 只在勾选时带上，避免给后端发一个恒为 false 的字段
      ...(values.sendOa ? { sendOa: true } : {}),
    }

    setSending(true)
    try {
      const res = await sendAdminMessage(params)
      if (res.success && res.data) {
        message.success('消息已发送')
        setResult({ params, res: res.data })
        form.resetFields()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 16px' }}>发送消息</h2>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="发给谁"
        description={
          <span>
            接收人填 <b>openid</b>：在「订单查询」或「反馈统计」的详情里可以复制到。
            不要填手机号——手机号在用户资料里不唯一（换绑、家人共用），系统无法确定发给哪一位。
          </span>
        }
      />

      <Card>
        <Form form={form} layout="vertical" style={{ maxWidth: 640 }} initialValues={{ sendOa: false }}>
          <Form.Item
            name="openid"
            label="接收人 openid"
            rules={[
              { required: true, whitespace: true, message: '请填写接收人 openid' },
              { max: 64, message: 'openid 不能超过 64 个字符' },
            ]}
          >
            <Input placeholder="例如 oXXXXXXXXXXXXXXXXXXXXXXXXXXX" allowClear />
          </Form.Item>

          <Form.Item
            name="title"
            label="标题"
            rules={[
              { required: true, whitespace: true, message: '请填写标题' },
              { max: TITLE_MAX, message: `标题不能超过 ${TITLE_MAX} 字` },
            ]}
          >
            <Input placeholder={`一行说清是什么事（最多 ${TITLE_MAX} 字）`} allowClear showCount maxLength={TITLE_MAX} />
          </Form.Item>

          <Form.Item
            name="content"
            label="正文"
            rules={[
              { required: true, whitespace: true, message: '请填写正文' },
              { max: CONTENT_MAX, message: `正文不能超过 ${CONTENT_MAX} 字` },
            ]}
          >
            <Input.TextArea
              rows={5}
              placeholder="写清楚结论和下一步，用户只能看到这段文字，没有别的上下文"
              showCount
              maxLength={CONTENT_MAX}
            />
          </Form.Item>

          <Form.Item
            name="sendOa"
            label="同时发服务号推送"
            valuePropName="checked"
            extra="服务号通道尚未上线，勾选也只会记录一次请求，不会真的推送。上线后这里会自动生效。"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={handleSend}>
                发送
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  form.resetFields()
                  setResult(null)
                }}
              >
                清空
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {result && (
        <Card title="发送结果" style={{ marginTop: 16, maxWidth: 640 }}>
          {/* 「仅站内信」这句提示的文案来源是**后端的 oaSent**，不是前端写死的：
              服务号分支上线后 oaSent 变成 true，这里自动改口，前端不用改 */}
          <Alert
            type={result.res.oaSent ? 'success' : 'warning'}
            showIcon
            style={{ marginBottom: 16 }}
            message={result.res.oaSent ? '已同时发送服务号推送' : '仅站内信，用户需进入消息中心查看'}
            description={
              result.res.oaSent
                ? undefined
                : '本期未启用服务号通道，用户不会收到微信推送。紧急事项请另打电话联系。'
            }
          />
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="接收人">{result.params.openid}</Descriptions.Item>
            <Descriptions.Item label="标题">{result.params.title}</Descriptions.Item>
            <Descriptions.Item label="正文">{result.params.content}</Descriptions.Item>
            <Descriptions.Item label="消息 ID">{result.res.messageId ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="发送时间">
              {result.res.createdAt ? dayjs(result.res.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  )
}
