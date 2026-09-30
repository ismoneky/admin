import { useState } from 'react'
import { Card, Alert, Descriptions, message } from 'antd'
import dayjs from 'dayjs'
import AdminMessageForm, { type SentAdminMessage } from '../../components/AdminMessageForm'

export default function MessagesPage() {
  const [result, setResult] = useState<SentAdminMessage | null>(null)

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
            接收人填 <b>openid</b>：在「订单查询」或「反馈统计」的详情里可以复制到，也可以在反馈列表直接点击「回复」。
            不要填手机号——手机号在用户资料里不唯一（换绑、家人共用），系统无法确定发给哪一位。
          </span>
        }
      />

      <Card>
        <AdminMessageForm
          onSent={(sent) => {
            message.success('消息已发送')
            setResult(sent)
          }}
          onReset={() => setResult(null)}
        />
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
