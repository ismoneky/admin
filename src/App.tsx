import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import AuthGuard from "./components/AuthGuard";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/login";
import DashboardPage from "./pages/dashboard";
import AnnouncementsPage from "./pages/announcements";
import SystemConfigPage from "./pages/system-config";
import OrdersPage from "./pages/orders";
import RefundsPage from "./pages/refunds";
import ApplicationsPage from "./pages/applications";
import FeedbacksPage from "./pages/feedbacks";
import MembersPage from "./pages/members";
import MessagesPage from "./pages/messages";
import TasksPage from "./pages/tasks";
import LogsPage from "./pages/logs";

dayjs.locale("zh-cn");

function Beian() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: isLogin ? 0 : 200,
        right: 0,
        textAlign: 'center',
        padding: '8px 24px',
        fontSize: 12,
        color: '#999',
        zIndex: 100,
      }}
    >
      <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer" style={{ color: '#999' }}>
        豫ICP备2026013379号-1
      </a>
    </div>
  )
}

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
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="system-config" element={<SystemConfigPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="refunds" element={<RefundsPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="feedbacks" element={<FeedbacksPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="logs" element={<LogsPage />} />
            </Route>
          </Routes>
          <Beian />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
