import { useEffect, useState } from 'react'
import { Table, Input, Modal, Descriptions, Button } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getFeedbacks } from '../../api/feedbacks'
import type { Feedback } from '../../types'

export default function FeedbacksPage() {
  const [list, setList] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [current, setCurrent] = useState<Feedback | null>(null)

  useEffect(() => {
    setLoading(true)
    getFeedbacks()
      .then((res) => {
        if (res.success && res.data) setList(res.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = keyword
    ? list.filter(
        (item) =>
          item.phone.includes(keyword) ||
          item.content.includes(keyword) ||
          item.wechatOpenId.includes(keyword)
      )
    : list

  const columns: ColumnsType<Feedback> = [
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
    },
    {
      title: '微信 OpenID',
      dataIndex: 'wechatOpenId',
      width: 300,
      ellipsis: true,
    },
    {
      title: '反馈内容',
      dataIndex: 'content',
      ellipsis: true,
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setCurrent(record)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>反馈统计</h2>
        <Input.Search
          placeholder="搜索手机号 / 内容 / OpenID"
          allowClear
          style={{ width: 260 }}
          onSearch={setKeyword}
          onChange={(e) => { if (!e.target.value) setKeyword('') }}
        />
      </div>
      <Table
        rowKey="feedbackId"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        scroll={{ x: 900, y: 'calc(100vh - 390px)' }}
        pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 条` }}
      />

      <Modal
        title="反馈详情"
        open={!!current}
        onCancel={() => setCurrent(null)}
        footer={null}
        width={560}
      >
        {current && (
          <Descriptions bordered column={1} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="手机号">{current.phone}</Descriptions.Item>
            <Descriptions.Item label="微信 OpenID">{current.wechatOpenId}</Descriptions.Item>
            <Descriptions.Item label="反馈内容">{current.content}</Descriptions.Item>
            <Descriptions.Item label="提交时间">{new Date(current.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
