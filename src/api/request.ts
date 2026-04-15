import axios from 'axios'
import { message } from 'antd'
import { useAuthStore } from '../stores/authStore'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

request.interceptors.request.use((config) => {
  const apiKey = useAuthStore.getState().apiKey
  if (apiKey) {
    config.headers['x-admin-key'] = `${apiKey}`
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
