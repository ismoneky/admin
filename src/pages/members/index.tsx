import { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Button,
  Space,
  Select,
  Input,
  Modal,
  Form,
  DatePicker,
  Tag,
  Popconfirm,
  Card,
  Row,
  Col,
  message,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, CrownOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type {
  Member,
  MemberStatus,
  MemberQueryParams,
  CreateMemberDto,
} from '../../types'
import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
} from '../../api/members'

const statusOptions = [
  { label: '全部', value: '' },
  { label: '生效中', value: 'active' },
  { label: '已过期', value: 'expired' },
  { label: '已停用', value: 'disabled' },
]

const statusTagMap: Record<MemberStatus, { color: string; text: string }> = {
  active: { color: 'green', text: '生效中' },
  expired: { color: 'default', text: '已过期' },
  disabled: { color: 'red', text: '已停用' },
}

const { RangePicker } = DatePicker

export default function MembersPage() {
  const [data, setData] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  })
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Member | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchData = useCallback(
    async (params?: MemberQueryParams) => {
      setLoading(true)
      try {
        const res = await getMembers(params)
        if (res.success && res.data) {
          setData(res.data)
          setPagination((prev) => ({
            ...prev,
            total: res.pagination?.total ?? 0,
          }))
        }
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    fetchData({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: keyword || undefined,
      status: (statusFilter || undefined) as MemberStatus | undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize, statusFilter])

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchData({
      page: 1,
      pageSize: pagination.pageSize,
      keyword: keyword || undefined,
      status: (statusFilter || undefined) as MemberStatus | undefined,
    })
  }

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({
      dateRange: [dayjs(), dayjs().add(30, 'day')],
      licensePlates: [],
    })
    setModalOpen(true)
  }

  const handleEdit = (record: Member) => {
    setEditingItem(record)
    form.setFieldsValue({
      phone: record.phone,
      name: record.name,
      idCard: record.idCard,
      licensePlates: record.licensePlates
        ? record.licensePlates.split(';').map((s) => s.trim()).filter(Boolean)
        : [],
      dateRange: [dayjs(record.startDate), dayjs(record.endDate)],
      remarks: record.remarks,
      status: record.status,
    })
    setModalOpen(true)
  }

  const handleDelete = async (memberId: string) => {
    try {
      const res = await deleteMember(memberId)
      if (res.success) {
        message.success('删除成功')
        fetchData({
          page: pagination.page,
          pageSize: pagination.pageSize,
          keyword: keyword || undefined,
          status: (statusFilter || undefined) as MemberStatus | undefined,
        })
      }
    } catch {
      /* error handled by interceptor */
    }
  }

  const handleToggleStatus = async (record: Member, newStatus: MemberStatus) => {
    try {
      const res = await updateMember(record.memberId, { status: newStatus })
      if (res.success) {
        message.success(newStatus === 'disabled' ? '已停用' : '已启用')
        fetchData({
          page: pagination.page,
          pageSize: pagination.pageSize,
          keyword: keyword || undefined,
          status: (statusFilter || undefined) as MemberStatus | undefined,
        })
      }
    } catch {
      /* error handled by interceptor */
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      const startDate = values.dateRange[0].format('YYYY-MM-DD')
      const endDate = values.dateRange[1].format('YYYY-MM-DD')

      if (editingItem) {
        const res = await updateMember(editingItem.memberId, {
          name: values.name,
          phone: values.phone,
          idCard: values.idCard,
          licensePlates: (values.licensePlates || []).map((p: string) => p.toUpperCase().trim()).filter(Boolean),
          startDate,
          endDate,
          remarks: values.remarks || '',
        })
        if (res.success) {
          message.success('更新成功')
          setModalOpen(false)
          fetchData({
            page: pagination.page,
            pageSize: pagination.pageSize,
            keyword: keyword || undefined,
            status: (statusFilter || undefined) as MemberStatus | undefined,
          })
        }
      } else {
        const dto: CreateMemberDto = {
          phone: values.phone,
          name: values.name,
          idCard: values.idCard,
          licensePlates: (values.licensePlates || []).map((p: string) => p.toUpperCase().trim()).filter(Boolean),
          startDate,
          endDate,
          remarks: values.remarks || '',
        }
        const res = await createMember(dto)
        if (res.success) {
          message.success('创建成功')
          setModalOpen(false)
          fetchData({
            page: 1,
            pageSize: pagination.pageSize,
            keyword: keyword || undefined,
            status: (statusFilter || undefined) as MemberStatus | undefined,
          })
        }
      }
    } catch {
      /* error handled by interceptor */
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<Member> = [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
    },
    {
      title: '身份证号',
      dataIndex: 'idCard',
      width: 180,
      render: (idCard: string) => {
        if (!idCard || idCard.length < 8) return idCard
        return `${idCard.slice(0, 4)}***${idCard.slice(-4)}`
      },
    },
    {
      title: '车牌号',
      dataIndex: 'licensePlates',
      width: 200,
      ellipsis: true,
      render: (val?: string) => {
        if (!val) return '-'
        const list = val.split(';').map((s) => s.trim()).filter(Boolean)
        return list.length ? list.map((p) => <Tag key={p}>{p}</Tag>) : '-'
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: MemberStatus) => {
        const { color, text } = statusTagMap[status]
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '有效期',
      key: 'dateRange',
      width: 200,
      render: (_, record) =>
        `${dayjs(record.startDate).format('YYYY/MM/DD')} ~ ${dayjs(record.endDate).format('YYYY/MM/DD')}`,
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      ellipsis: true,
      width: 150,
      render: (val?: string) => val || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
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
          {record.status === 'disabled' ? (
            <Button
              type="link"
              size="small"
              onClick={() => handleToggleStatus(record, 'active')}
            >
              启用
            </Button>
          ) : (
            <Popconfirm
              title="确认停用该会员？"
              description="停用后该用户不再享受会员免费"
              onConfirm={() => handleToggleStatus(record, 'disabled')}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small" danger>
                停用
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="确认删除该会员？"
            description="删除后该用户不再享受会员免费，已产生的免费订单不受影响"
            onConfirm={() => handleDelete(record.memberId)}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ danger: true }}
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
    <div>
      {/* 页头 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space align="center" size={12}>
          <CrownOutlined style={{ fontSize: 24, color: '#faad14' }} />
          <h2 style={{ margin: 0 }}>月卡会员管理</h2>
          <Tag color="orange" style={{ marginLeft: 4 }}>摩托车专用</Tag>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增会员
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            placeholder="搜索姓名/手机号/身份证号/车牌号"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={statusOptions}
            style={{ width: 120 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
        </div>
      </Card>

      {/* 表格 */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1400, y: 'calc(100vh - 360px)' }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (t) => `共 ${t} 条`,
            showSizeChanger: true,
            onChange: (page, pageSize) =>
              setPagination((prev) => ({ ...prev, page, pageSize })),
          }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingItem ? '编辑月卡会员' : '新增月卡会员'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={editingItem ? '保存' : '确认创建'}
        cancelText="取消"
        width={620}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label={<>手机号 <span style={{ fontSize: 12, color: '#999' }}>仅展示</span></>}
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
                ]}
              >
                <Input placeholder="请输入手机号" maxLength={11} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="idCard"
            label={<>身份证号 <span style={{ fontSize: 12, color: '#999' }}>唯一，凭此匹配</span></>}
            rules={[
              { required: true, message: '请输入身份证号' },
              { pattern: /^\d{17}[\dXx]$/, message: '请输入正确的身份证号' },
            ]}
          >
            <Input placeholder="请输入身份证号" maxLength={18} />
          </Form.Item>

          <Form.Item
            name="licensePlates"
            label={<>车牌号 <span style={{ fontSize: 12, color: '#999' }}>回车添加，可多个</span></>}
            required
            rules={[
              {
                validator: (_, value: string[]) => {
                  const list = (value || []).map((p) => (p || '').toUpperCase().trim()).filter(Boolean)
                  if (list.length === 0) return Promise.reject('请至少添加一个车牌号')
                  const re = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/
                  const bad = list.find((p) => !re.test(p))
                  return bad ? Promise.reject(`车牌号格式不正确：${bad}`) : Promise.resolve()
                },
              },
            ]}
          >
            <Select
              mode="tags"
              placeholder="如：京A12345（输完按回车）"
              tokenSeparators={[',', ';']}
              style={{ width: '100%' }}
              open={false}
              suffixIcon={<span style={{ color: '#999', fontSize: 12 }}>回车添加</span>}
            />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="有效期"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remarks" label="备注">
            <Input.TextArea rows={2} placeholder="选填，如：月卡会员-8月" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
