import { Layout, Menu, Avatar, Dropdown, theme } from 'antd'
import {
  NotificationOutlined,
  SettingOutlined,
  OrderedListOutlined,
  UserOutlined,
  LogoutOutlined,
  SolutionOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const { Header, Sider, Content } = Layout

const menuItems = [
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
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { name, logout } = useAuthStore()
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        width={200}
        style={{ position: 'fixed', height: '100vh', left: 0, top: 0, bottom: 0 }}
      >
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
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ marginLeft: 200 }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{name}</span>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24 }}>
          <div
            style={{
              padding: 24,
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
