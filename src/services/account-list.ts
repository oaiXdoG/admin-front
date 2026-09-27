import axios from 'axios'
import { request } from '@/services/request.ts'
import type { AccountRecord, ApiResponse } from '@/types/api.ts'

export async function fetchAccounts() {
  try {
    const response = await request.post<ApiResponse<AccountRecord[]>>('/api/account/list', {})
    const body = response.data
    if (!body || body.code !== 0 || !body.data) throw new Error(body?.message || '获取用户失败')
    return body.data
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) throw error
    if (axios.isAxiosError<ApiResponse<unknown>>(error) && error.response?.data?.message) throw new Error(error.response.data.message)
    throw new Error('获取用户失败')
  }
}
