import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/es/locale/zh_CN";
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
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
