import { Layout, Menu, Drawer, Button, Grid } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import BeianFooter from '../components/BeianFooter'
import './main-layout.css'

const { Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', label: '经营统计' },
  { key: '/announcements', label: '公告管理' },
  { key: '/system-config', label: '系统配置' },
  { key: '/scenic-guide', label: '景区导览' },
  { key: '/orders', label: '订单查询' },
  { key: '/refunds', label: '退款审核' },
  { key: '/applications', label: '管理员申请' },
  { key: '/feedbacks', label: '反馈统计' },
  { key: '/members', label: '月卡会员' },
  { key: '/messages', label: '发送消息' },
  { key: '/tasks', label: '定时任务' },
  { key: '/logs', label: '日志查询' },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key !== location.pathname && !window.dispatchEvent(new Event('scenic-guide:before-leave', { cancelable: true }))) return
    navigate(key)
    setDrawerOpen(false)
  }

  const handleLogout = () => {
    if (!window.dispatchEvent(new Event('scenic-guide:before-leave', { cancelable: true }))) return
    logout()
    navigate('/login')
  }

  const navigation = (
    <div className="main-layout__navigation">
      <div className="main-layout__brand">
        <span>后台管理系统</span>
        {isMobile && (
          <Button type="text" onClick={() => setDrawerOpen(false)}>
            关闭
          </Button>
        )}
      </div>
      <nav className="main-layout__menu" aria-label="后台导航">
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </nav>
      <div className="main-layout__logout">
        <Button type="text" block onClick={handleLogout}>
          退出登录
        </Button>
      </div>
    </div>
  )

  return (
    <Layout className="main-layout">
      {!isMobile && (
        <Sider theme="dark" width={200} className="main-layout__sidebar">
          {navigation}
        </Sider>
      )}

      <Drawer
        placement="left"
        open={isMobile && drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={240}
        styles={{ body: { padding: 0, background: '#001529' } }}
        closable={false}
      >
        {navigation}
      </Drawer>

      <Layout className="main-layout__workspace">
        {isMobile && (
          <div className="main-layout__mobile-bar">
            <span>后台管理系统</span>
            <Button
              size="small"
              aria-label="打开导航菜单"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              菜单
            </Button>
          </div>
        )}
        <Content className="main-layout__content">
          <div className="main-layout__content-body">
            <Outlet />
          </div>
        </Content>
        <BeianFooter />
      </Layout>
    </Layout>
  )
}
