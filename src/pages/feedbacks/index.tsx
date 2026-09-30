import { useEffect, useState } from 'react'
import { Input, Modal, Descriptions, Button, Space, Alert, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getFeedbacks } from '../../api/feedbacks'
import type { Feedback } from '../../types'
import QueryFilterPanel, { QueryFilterItem } from '../../components/QueryFilterPanel'
import AutoHeightTable from '../../components/AutoHeightTable'
import AdminMessageForm from '../../components/AdminMessageForm'

export default function FeedbacksPage() {
  const [list, setList] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [current, setCurrent] = useState<Feedback | null>(null)
  const [replyTarget, setReplyTarget] = useState<Feedback | null>(null)
  const [replySending, setReplySending] = useState(false)

  const openReply = (record: Feedback) => {
    setCurrent(null)
    setReplyTarget(record)
  }

  const closeReply = () => {
    if (!replySending) setReplyTarget(null)
  }

  useEffect(() => {
    setLoading(true)
    getFeedbacks()
      .then((res) => {
        if (res.success && res.data) {
          setList([...res.data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ))
        }
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
      width: 140,
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => setCurrent(record)}>详情</Button>
          <Button type="link" size="small" disabled={!record.wechatOpenId?.trim()} onClick={() => openReply(record)}>
            回复
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ margin: '0 0 16px' }}>反馈统计</h2>
      <QueryFilterPanel columns={1} compact>
        <QueryFilterItem label="搜索反馈">
          <Input.Search
            placeholder="搜索手机号 / 内容 / OpenID"
            allowClear
            onSearch={setKeyword}
            onChange={(e) => { if (!e.target.value) setKeyword('') }}
          />
        </QueryFilterItem>
      </QueryFilterPanel>
      <AutoHeightTable
        rowKey="feedbackId"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{
          placement: ['bottomCenter'],
          pageSize: 20,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title="反馈详情"
        open={!!current}
        onCancel={() => setCurrent(null)}
        footer={current && (
          <Button type="primary" disabled={!current.wechatOpenId?.trim()} onClick={() => openReply(current)}>
            回复
          </Button>
        )}
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

      <Modal
        title="回复反馈"
        open={!!replyTarget}
        onCancel={closeReply}
        footer={null}
        width={640}
        destroyOnHidden
        closable={!replySending}
        keyboard={!replySending}
        mask={{ closable: !replySending }}
      >
        {replyTarget && (
          <>
            <Descriptions column={1} size="small" style={{ margin: '16px 0' }}>
              <Descriptions.Item label="手机号">{replyTarget.phone}</Descriptions.Item>
              <Descriptions.Item label="原反馈">
                <div style={{ maxHeight: 120, overflowY: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {replyTarget.content}
                </div>
              </Descriptions.Item>
            </Descriptions>
            <Alert
              type="info"
              title="回复将发送到该用户的小程序消息中心。"
              style={{ marginBottom: 16 }}
            />
            <AdminMessageForm
              key={replyTarget.feedbackId}
              lockedRecipient={replyTarget.wechatOpenId}
              initialTitle="反馈回复"
              submitText="发送回复"
              onCancel={closeReply}
              onSendingChange={setReplySending}
              onSent={({ res }) => {
                message.success(res.oaSent ? '回复已发送，并已发送服务号推送' : '回复已发送，用户可在消息中心查看')
                setReplyTarget(null)
              }}
            />
          </>
        )}
      </Modal>
    </div>
  )
}
