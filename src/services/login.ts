import axios from 'axios'
import { saveSession } from '@/stores/session.ts'
import type { ApiResponse, LoginData } from '@/types/api.ts'

const LOGIN_URL = '/api/login'

export async function login(account: string, password: string) {
  try {
    const response = await axios.post<ApiResponse<LoginData>>(LOGIN_URL, {
      account: account.trim(),
      password,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    })
    const body = response.data
    if (!body || body.code !== 0 || !body.data?.token) {
      throw new Error(body?.message || '登录失败')
    }
    saveSession(body.data)
    return body.data
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) {
      throw error
    }
    if (axios.isAxiosError<ApiResponse<LoginData>>(error)) {
      const message = error.response?.data?.message
      if (message) {
        throw new Error(message)
      }
    }
    throw new Error('登录失败')
  }
}
