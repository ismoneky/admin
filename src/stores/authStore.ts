import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  apiKey: string | null
  /**
   * 操作人 token（阶段 3 §4.3.4，有效期 12h）
   *
   * 只用于**识别操作人**（后端据此写 `refund_applies.auditAdminId`），
   * 不承担准入：接口准入仍是 `apiKey`。所以它过期时不必强制退出登录，
   * 只是后续审核的 operator 会变成 null —— 这会体现在审核记录里。
   * 可空：老版本登录态（持久化在 localStorage 里的旧数据）没有这个字段。
   */
  adminToken: string | null
  name: string | null
  username: string | null
  setAuth: (apiKey: string, name: string, username: string, adminToken?: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      apiKey: null,
      adminToken: null,
      name: null,
      username: null,
      setAuth: (apiKey, name, username, adminToken = null) =>
        set({ apiKey, adminToken, name, username }),
      logout: () => set({ apiKey: null, adminToken: null, name: null, username: null }),
    }),
    { name: 'admin-auth' }
  )
)
