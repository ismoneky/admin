import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import AuthGuard from './components/AuthGuard'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/login'
import AnnouncementsPage from './pages/announcements'
import SystemConfigPage from './pages/system-config'
import OrdersPage from './pages/orders'
import ApplicationsPage from './pages/applications'

dayjs.locale('zh-cn')

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <AuthGuard>
                  <MainLayout />
                </AuthGuard>
              }
            >
              <Route index element={<Navigate to="/announcements" replace />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="system-config" element={<SystemConfigPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
