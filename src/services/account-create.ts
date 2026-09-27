import axios from 'axios'
import { request } from '@/services/request.ts'
import type { AccountCreateData, ApiResponse } from '@/types/api.ts'

const ACCOUNT_CREATE_URL = '/api/account/create'

export async function createAccount(body: {
  account: string
  password: string
  username: string
}) {
  try {
    const response = await request.post<ApiResponse<AccountCreateData>>(ACCOUNT_CREATE_URL, {
      account: body.account.trim(),
      password: body.password,
      username: body.username.trim(),
    })
    const result = response.data
    if (!result || result.code !== 0 || !result.data) {
      throw new Error(result?.message || '创建账号失败')
    }
    return result.data
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) {
      throw error
    }
    if (axios.isAxiosError<ApiResponse<AccountCreateData>>(error)) {
      const message = error.response?.data?.message
      if (message) {
        throw new Error(message)
      }
    }
    throw new Error('创建账号失败')
  }
}
