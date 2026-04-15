import { useEffect, useState } from 'react'
import {
  Form,
  Switch,
  Input,
  InputNumber,
  Button,
  message,
  Card,
  Spin,
} from 'antd'
import { getSystemConfig, updateSystemConfig } from '../../api/systemConfig'
import type { SystemConfig, TimeSlotLimit, PaymentConfig } from '../../types'

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
        const timeSlotLimit: TimeSlotLimit = JSON.parse(config.timeSlotLimitJson)
        const paymentConfig: PaymentConfig = JSON.parse(config.paymentConfigJson)
        setBookingEnabled(config.bookingEnabled)
        form.setFieldsValue({
          bookingEnabled: config.bookingEnabled,
          bookingDisabledMessage: config.bookingDisabledMessage,
          morningMaxPeople: timeSlotLimit?.morningMaxPeople ?? 100,
          afternoonMaxPeople: timeSlotLimit?.afternoonMaxPeople ?? 100,
          paymentAmount: paymentConfig?.paymentAmount ?? 0,
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>系统配置</h2>
        <Button type="primary" loading={submitting} onClick={() => form.submit()}>
          保存配置
        </Button>
      </div>
      <Form
        form={form}
        layout="inline"
        onFinish={onFinish}
        style={{ maxWidth: 800 }}
        onValuesChange={(changed) => {
          if ('bookingEnabled' in changed) {
            setBookingEnabled(changed.bookingEnabled)
          }
        }}
      >
        <Card title="预约配置" style={{ marginBottom: 12, width: '100%' }} size="small">
          <Form.Item name="bookingEnabled" label="是否开放预约" valuePropName="checked" style={{ marginBottom: bookingEnabled ? 0 : 8 }}>
            <Switch checkedChildren="开放" unCheckedChildren="关闭" />
          </Form.Item>
          {!bookingEnabled && (
            <Form.Item
              name="bookingDisabledMessage"
              label="关闭提示文案"
              rules={[{ required: true, message: '请输入提示文案' }]}
              style={{ marginBottom: 0, marginTop: 8, width: '100%' }}
            >
              <TextArea rows={2} placeholder="请输入关闭预约时展示给用户的提示信息" style={{ width: 400 }} />
            </Form.Item>
          )}
        </Card>

        <Card title="时间段人数限制" style={{ marginBottom: 12, width: '100%' }} size="small">
          <Form.Item
            name="morningMaxPeople"
            label="上午最大人数"
            rules={[{ required: true, message: '请输入' }]}
            style={{ marginBottom: 12 }}
          >
            <InputNumber min={1} style={{ width: 160 }} addonAfter="人" />
          </Form.Item>
          <Form.Item
            name="afternoonMaxPeople"
            label="下午最大人数"
            rules={[{ required: true, message: '请输入' }]}
            style={{ marginBottom: 0 }}
          >
            <InputNumber min={1} style={{ width: 160 }} addonAfter="人" />
          </Form.Item>
        </Card>

        <Card title="支付配置" style={{ marginBottom: 12, width: '100%' }} size="small">
          <Form.Item
            name="paymentAmount"
            label="预约支付金额"
            rules={[{ required: true, message: '请输入支付金额' }]}
            style={{ marginBottom: 0 }}
          >
            <InputNumber min={0} precision={0} style={{ width: 160 }} addonAfter="分" />
          </Form.Item>
        </Card>
      </Form>
    </Spin>
  )
}
