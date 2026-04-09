import { useEffect, useState } from 'react'
import {
  Form,
  Switch,
  Input,
  InputNumber,
  Button,
  message,
  Card,
  Divider,
  Spin,
} from 'antd'
import { getSystemConfig, updateSystemConfig } from '../../api/systemConfig'
import type { SystemConfig } from '../../types'

const { TextArea } = Input

export default function SystemConfigPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingEnabled, setBookingEnabled] = useState(true)

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await getSystemConfig()
      if (res.success && res.data) {
        const config: SystemConfig = res.data
        setBookingEnabled(config.bookingEnabled)
        form.setFieldsValue({
          bookingEnabled: config.bookingEnabled,
          bookingDisabledMessage: config.bookingDisabledMessage,
          morningMaxPeople: config.timeSlotLimit?.morningMaxPeople ?? 100,
          afternoonMaxPeople: config.timeSlotLimit?.afternoonMaxPeople ?? 100,
          paymentAmount: config.paymentConfig?.paymentAmount ?? 0,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const onFinish = async (values: {
    bookingEnabled: boolean
    bookingDisabledMessage: string
    morningMaxPeople: number
    afternoonMaxPeople: number
    paymentAmount: number
  }) => {
    setSubmitting(true)
    try {
      const res = await updateSystemConfig({
        bookingEnabled: values.bookingEnabled,
        bookingDisabledMessage: values.bookingDisabledMessage,
        timeSlotLimit: {
          morningMaxPeople: values.morningMaxPeople,
          afternoonMaxPeople: values.afternoonMaxPeople,
        },
        paymentConfig: {
          paymentAmount: values.paymentAmount,
        },
      })
      if (res.success) {
        message.success('系统配置更新成功')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Spin spinning={loading}>
      <h2 style={{ marginTop: 0, marginBottom: 24 }}>系统配置</h2>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 600 }}
        onValuesChange={(changed) => {
          if ('bookingEnabled' in changed) {
            setBookingEnabled(changed.bookingEnabled)
          }
        }}
      >
        <Card title="预约配置" style={{ marginBottom: 16 }}>
          <Form.Item name="bookingEnabled" label="是否开放预约" valuePropName="checked">
            <Switch checkedChildren="开放" unCheckedChildren="关闭" />
          </Form.Item>
          {!bookingEnabled && (
            <Form.Item
              name="bookingDisabledMessage"
              label="关闭预约时的提示文案"
              rules={[{ required: true, message: '请输入提示文案' }]}
            >
              <TextArea rows={2} placeholder="请输入关闭预约时展示给用户的提示信息" />
            </Form.Item>
          )}
        </Card>

        <Card title="时间段人数限制" style={{ marginBottom: 16 }}>
          <Form.Item
            name="morningMaxPeople"
            label="上午最大预约人数"
            rules={[{ required: true, message: '请输入上午最大人数' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} addonAfter="人" />
          </Form.Item>
          <Form.Item
            name="afternoonMaxPeople"
            label="下午最大预约人数"
            rules={[{ required: true, message: '请输入下午最大人数' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} addonAfter="人" />
          </Form.Item>
        </Card>

        <Card title="支付配置" style={{ marginBottom: 24 }}>
          <Form.Item
            name="paymentAmount"
            label="预约支付金额"
            rules={[{ required: true, message: '请输入支付金额' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} addonBefore="¥" addonAfter="元" />
          </Form.Item>
        </Card>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} size="large">
            保存配置
          </Button>
        </Form.Item>
      </Form>
    </Spin>
  )
}
