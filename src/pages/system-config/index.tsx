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
  Table,
  Modal,
  Space,
  Popconfirm,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getSystemConfig, updateSystemConfig } from '../../api/systemConfig'
import type { SystemConfig, TimeSlotLimit, PaymentConfig, Banner } from '../../types'

const { TextArea } = Input

export default function SystemConfigPage() {
  const [form] = Form.useForm()
  const [bannerForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingEnabled, setBookingEnabled] = useState(true)
  const [banners, setBanners] = useState<Banner[]>([])
  const [bannerModalVisible, setBannerModalVisible] = useState(false)
  const [editingBannerIndex, setEditingBannerIndex] = useState<number | null>(null)
  const [bannerSubmitting, setBannerSubmitting] = useState(false)

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await getSystemConfig()
      if (res.success && res.data) {
        const config: SystemConfig = res.data
        const timeSlotLimit: TimeSlotLimit = JSON.parse(config.timeSlotLimitJson)
        const paymentConfig: PaymentConfig = JSON.parse(config.paymentConfigJson)
        const bannerList: Banner[] = JSON.parse(config.bannersJson || '[]')
        setBookingEnabled(config.bookingEnabled)
        setBanners(bannerList)
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

  const saveBanners = async (newBanners: Banner[]) => {
    const values = form.getFieldsValue()
    await updateSystemConfig({
      bookingEnabled: values.bookingEnabled,
      bookingDisabledMessage: values.bookingDisabledMessage,
      banners: newBanners,
      timeSlotLimit: {
        morningMaxPeople: values.morningMaxPeople,
        afternoonMaxPeople: values.afternoonMaxPeople,
      },
      paymentConfig: { paymentAmount: values.paymentAmount },
    })
  }

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
        banners,
        timeSlotLimit: {
          morningMaxPeople: values.morningMaxPeople,
          afternoonMaxPeople: values.afternoonMaxPeople,
        },
        paymentConfig: { paymentAmount: values.paymentAmount },
      })
      if (res.success) {
        message.success('系统配置更新成功')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openAddBanner = () => {
    setEditingBannerIndex(null)
    bannerForm.resetFields()
    setBannerModalVisible(true)
  }

  const openEditBanner = (index: number) => {
    setEditingBannerIndex(index)
    bannerForm.setFieldsValue({ imageUrl: banners[index].imageUrl })
    setBannerModalVisible(true)
  }

  const handleDeleteBanner = async (index: number) => {
    const newBanners = banners.filter((_, i) => i !== index)
    try {
      await saveBanners(newBanners)
      setBanners(newBanners)
      message.success('删除成功')
    } catch {
      message.error('删除失败')
    }
  }

  const handleBannerSave = async () => {
    const values = await bannerForm.validateFields()
    setBannerSubmitting(true)
    try {
      const newBanners =
        editingBannerIndex !== null
          ? banners.map((b, i) => (i === editingBannerIndex ? { imageUrl: values.imageUrl } : b))
          : [...banners, { imageUrl: values.imageUrl }]
      await saveBanners(newBanners)
      setBanners(newBanners)
      setBannerModalVisible(false)
      message.success(editingBannerIndex !== null ? '修改成功' : '添加成功')
    } catch {
      message.error('保存失败')
    } finally {
      setBannerSubmitting(false)
    }
  }

  const bannerColumns: ColumnsType<Banner & { _index: number }> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: '图片链接',
      dataIndex: 'imageUrl',
      ellipsis: true,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
          {url}
        </a>
      ),
    },
    {
      title: '预览',
      key: 'preview',
      width: 90,
      render: (_, record) => (
        <img
          src={record.imageUrl}
          style={{ width: 64, height: 36, objectFit: 'cover', borderRadius: 4 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, __, index) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditBanner(index)} />
          <Popconfirm
            title="确认删除这张轮播图？"
            onConfirm={() => handleDeleteBanner(index)}
            okText="删除"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

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
          if ('bookingEnabled' in changed) setBookingEnabled(changed.bookingEnabled || false)
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
          <Form.Item name="morningMaxPeople" label="上午最大人数" rules={[{ required: true, message: '请输入' }]} style={{ marginBottom: 12 }}>
            <InputNumber min={1} style={{ width: 160 }} addonAfter="人" />
          </Form.Item>
          <Form.Item name="afternoonMaxPeople" label="下午最大人数" rules={[{ required: true, message: '请输入' }]} style={{ marginBottom: 0 }}>
            <InputNumber min={1} style={{ width: 160 }} addonAfter="人" />
          </Form.Item>
        </Card>

        <Card title="支付配置" style={{ marginBottom: 12, width: '100%' }} size="small">
          <Form.Item name="paymentAmount" label="预约支付金额" rules={[{ required: true, message: '请输入支付金额' }]} style={{ marginBottom: 0 }}>
            <InputNumber min={0} precision={0} style={{ width: 160 }} addonAfter="分" />
          </Form.Item>
        </Card>
      </Form>

      <Card
        title="轮播图配置"
        style={{ maxWidth: 800 }}
        size="small"
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddBanner}>
            添加
          </Button>
        }
      >
        <Table
          rowKey={(_, index) => String(index)}
          size="small"
          dataSource={banners.map((b, i) => ({ ...b, _index: i }))}
          columns={bannerColumns}
          pagination={false}
          locale={{ emptyText: '暂无轮播图，点击右上角添加' }}
        />
      </Card>

      <Modal
        title={editingBannerIndex !== null ? '编辑轮播图' : '添加轮播图'}
        open={bannerModalVisible}
        onCancel={() => setBannerModalVisible(false)}
        onOk={handleBannerSave}
        okText="保存"
        confirmLoading={bannerSubmitting}
        width={520}
      >
        <Form form={bannerForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="imageUrl"
            label="图片链接"
            rules={[
              { required: true, message: '请输入图片链接' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}
          >
            <Input placeholder="https://cdn.example.com/banner.jpg" />
          </Form.Item>
          <Form.Item noStyle dependencies={['imageUrl']}>
            {({ getFieldValue }) => {
              const url = getFieldValue('imageUrl')
              return url ? (
                <img
                  src={url}
                  style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 6 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : null
            }}
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  )
}
