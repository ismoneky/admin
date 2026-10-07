import { useState } from 'react'
import { Alert, App, Button } from 'antd'
import ScenicGuidePage from './index'

export default function GuideDemo() {
  const { modal, message } = App.useApp()
  const [version, setVersion] = useState(0)
  const [resetting, setResetting] = useState(false)
  const reset = () => modal.confirm({
    title: '恢复初始示例？', content: '将清除本次演示保存的地点和图片，恢复最初的五个示例地点。', okText: '恢复示例', cancelText: '继续编辑',
    onOk: async () => {
      setResetting(true)
      try {
        const response = await fetch('/__guide-demo/reset', { method: 'POST' })
        if (!response.ok) throw new Error('恢复失败，请重试')
        setVersion(value => value + 1)
        message.success('已恢复初始示例')
      } finally { setResetting(false) }
    },
  })
  return <main className="guide-demo-shell">
    <div className="guide-demo-brand">风车天路 <span>管理后台 / 景区导览</span></div>
    <Alert showIcon type="info" title="本地模拟 · 无需登录" description="可体验新增、拖动、编辑、隐藏、换图和保存。数据只保留在本次本地服务中，刷新有效，重启服务恢复示例；不会同步到线上小程序或腾讯云。" action={<Button onClick={reset} loading={resetting}>恢复示例</Button>} />
    <ScenicGuidePage key={version} />
  </main>
}
