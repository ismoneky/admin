import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Space,
  Switch,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { Announcement, CreateAnnouncementDto } from '../../types'
import {
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../../api/announcements'

const { TextArea } = Input

export default function AnnouncementsPage() {
  const [data, setData] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Announcement | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getAdminAnnouncements()
      if (res.success && res.data) setData(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true, sortOrder: 0 })
    setModalOpen(true)
  }

  const handleEdit = (record: Announcement) => {
    setEditingItem(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (announcementId: string) => {
    const res = await deleteAnnouncement(announcementId)
    if (res.success) {
      message.success('删除成功')
      fetchData()
    }
  }

  const handleToggleActive = async (record: Announcement, checked: boolean) => {
    const res = await updateAnnouncement(record.announcementId, { isActive: checked })
    if (res.success) {
      message.success(checked ? '已启用' : '已禁用')
      fetchData()
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      if (editingItem) {
        const res = await updateAnnouncement(editingItem.announcementId, values)
        if (res.success) {
          message.success('更新成功')
          setModalOpen(false)
          fetchData()
        }
      } else {
        const res = await createAnnouncement(values as CreateAnnouncementDto)
        if (res.success) {
          message.success('创建成功')
          setModalOpen(false)
          fetchData()
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<Announcement> = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 80,
      sorter: (a, b) => a.sortOrder - b.sortOrder,
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 100,
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(checked) => handleToggleActive(record, checked)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该公告？"
            onConfirm={() => handleDelete(record.announcementId)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className='content'>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>公告管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建公告
        </Button>
      </div>

      <Table
        className='table'
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 900, y: 'calc(100vh - 390px)' }}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title={editingItem ? '编辑公告' : '新建公告'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="公告标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入公告标题" />
          </Form.Item>
          <Form.Item name="content" label="公告内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={4} placeholder="请输入公告内容" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序（数字越小越靠前）">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isActive" label="是否启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
