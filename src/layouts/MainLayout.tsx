import { Layout, Menu, Avatar, Dropdown, theme, Drawer, Button, Grid } from 'antd'
import {
  DashboardOutlined,
  NotificationOutlined,
  SettingOutlined,
  OrderedListOutlined,
  UserOutlined,
  LogoutOutlined,
  SolutionOutlined,
  MessageOutlined,
  CrownOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

const { Header, Sider, Content } = Layout

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '经营统计',
  },
  {
    key: '/announcements',
    icon: <NotificationOutlined />,
    label: '公告管理',
  },
  {
    key: '/system-config',
    icon: <SettingOutlined />,
    label: '系统配置',
  },
  {
    key: '/orders',
    icon: <OrderedListOutlined />,
    label: '订单查询',
  },
  {
    key: '/applications',
    icon: <SolutionOutlined />,
    label: '管理员申请',
  },
  {
    key: '/feedbacks',
    icon: <MessageOutlined />,
    label: '反馈统计',
  },
  {
    key: '/members',
    icon: <CrownOutlined />,
    label: '月卡会员',
  },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { name, logout } = useAuthStore()
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()
  // md 断点（768px）以下走移动端布局：无 Sider，导航收进抽屉
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
    setDrawerOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const brandTitle = (
    <div
      style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 16,
        fontWeight: 600,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      后台管理系统
    </div>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          theme="dark"
          width={200}
          style={{ position: 'fixed', height: '100vh', left: 0, top: 0, bottom: 0 }}
        >
          {brandTitle}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ marginTop: 8 }}
          />
        </Sider>
      )}

      {/* 移动端抽屉导航 */}
      <Drawer
        placement="left"
        open={isMobile && drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={220}
        styles={{ body: { padding: 0, background: '#001529' } }}
        closable={false}
      >
        {brandTitle}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ marginTop: 8 }}
        />
      </Drawer>

      <Layout style={{ marginLeft: isMobile ? 0 : 200, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {isMobile ? (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
            />
          ) : (
            <span />
          )}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{name}</span>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: isMobile ? '12px 12px 24px' : '24px 24px 60px' }}>
          <div
            style={{
              padding: isMobile ? 12 : 24,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
