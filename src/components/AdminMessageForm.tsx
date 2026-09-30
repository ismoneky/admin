import { useRef, useState } from 'react'
import { Button, Form, Input, Space, Switch, message } from 'antd'
import { sendAdminMessage } from '../api/messages'
import type { SendMessageParams, SendMessageResult } from '../types'

const TITLE_MAX = 50
const CONTENT_MAX = 500

export interface SentAdminMessage {
  params: SendMessageParams
  res: SendMessageResult
}

interface AdminMessageFormProps {
  lockedRecipient?: string
  initialTitle?: string
  submitText?: string
  onSent: (result: SentAdminMessage) => void
  onReset?: () => void
  onCancel?: () => void
  onSendingChange?: (sending: boolean) => void
}

export default function AdminMessageForm({
  lockedRecipient,
  initialTitle,
  submitText = '发送',
  onSent,
  onReset,
  onCancel,
  onSendingChange,
}: AdminMessageFormProps) {
  const [form] = Form.useForm<SendMessageParams>()
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)
  const recipientLocked = lockedRecipient !== undefined

  const handleSend = async (values: SendMessageParams) => {
    if (sendingRef.current) return

    const params: SendMessageParams = {
      openid: (lockedRecipient ?? values.openid).trim(),
      title: values.title.trim(),
      content: values.content.trim(),
      ...(values.sendOa ? { sendOa: true } : {}),
    }

    sendingRef.current = true
    setSending(true)
    onSendingChange?.(true)
    try {
      const response = await sendAdminMessage(params)
      if (!response.success || !response.data || response.data.messageId == null) {
        message.error(!response.success && response.message ? response.message : '消息未发送成功，请稍后重试')
        return
      }
      form.resetFields()
      onSent({ params, res: response.data })
    } catch {
      // The request interceptor reports errors; keep the draft for a manual retry.
    } finally {
      sendingRef.current = false
      setSending(false)
      onSendingChange?.(false)
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      style={{ maxWidth: 640 }}
      initialValues={{ openid: lockedRecipient, title: initialTitle, sendOa: false }}
      disabled={sending}
      onFinish={handleSend}
    >
      <Form.Item
        name="openid"
        label="接收人 openid"
        rules={[
          { required: true, whitespace: true, message: '请填写接收人 openid' },
          { max: 64, message: 'openid 不能超过 64 个字符' },
        ]}
      >
        <Input
          placeholder="例如 oXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          readOnly={recipientLocked}
          allowClear={!recipientLocked}
        />
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
        label={recipientLocked ? '回复内容' : '正文'}
        rules={[
          { required: true, whitespace: true, message: '请填写内容' },
          { max: CONTENT_MAX, message: `内容不能超过 ${CONTENT_MAX} 字` },
        ]}
      >
        <Input.TextArea
          rows={5}
          placeholder={recipientLocked ? '请输入给用户的回复' : '写清楚结论和下一步，用户只能看到这段文字，没有别的上下文'}
          showCount
          maxLength={CONTENT_MAX}
        />
      </Form.Item>
      {!recipientLocked && (
        <Form.Item
          name="sendOa"
          label="同时发服务号推送"
          valuePropName="checked"
          extra="服务号通道尚未上线，勾选也只会记录一次请求，不会真的推送。上线后这里会自动生效。"
        >
          <Switch />
        </Form.Item>
      )}
      <Form.Item style={{ marginBottom: 0 }}>
        <Space>
          <Button type="primary" htmlType="submit" loading={sending}>
            {submitText}
          </Button>
          {onCancel ? (
            <Button onClick={onCancel}>取消</Button>
          ) : (
            <Button onClick={() => { form.resetFields(); onReset?.() }}>清空</Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  )
}
