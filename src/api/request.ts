import axios from 'axios'
import { message } from 'antd'
import { useAuthStore } from '../stores/authStore'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

request.interceptors.request.use((config) => {
  const { apiKey, adminToken } = useAuthStore.getState()
  if (apiKey) {
    config.headers['x-admin-key'] = `${apiKey}`
  }
  // adminToken 仅用于识别操作人（阶段 3 §4.3.4）；无它时后端仍凭 apiKey 放行，
  // 只是审核记录里 operator 为 null。两个头同时带是设计如此，不是重复鉴权。
  if (adminToken) {
    config.headers['x-admin-token'] = adminToken
  }
  return config
})

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      message.error('登录已过期，请重新登录')
    } else {
      const msg = error.response?.data?.message || '请求失败'
      message.error(msg)
    }
    return Promise.reject(error)
  }
)

export default request
