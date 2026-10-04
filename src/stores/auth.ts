import { defineStore } from 'pinia'
import type { Account, Role } from '../types'

const KEY = 'yoga_auth_v1'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    current: null as Account | null,
  }),
  getters: {
    role: (s): Role | null => s.current?.role ?? null,
    isLoggedIn: (s) => !!s.current,
  },
  actions: {
    init() {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        try { this.current = JSON.parse(raw) } catch { this.current = null }
      }
    },
    login(account: Account) {
      this.current = account
      localStorage.setItem(KEY, JSON.stringify(account))
    },
    logout() {
      this.current = null
      localStorage.removeItem(KEY)
    },
  },
})
