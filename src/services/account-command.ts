import axios from 'axios'
import { request } from '@/services/request.ts'
import type { AccountMembership, AccountUpdateValues, ApiResponse } from '@/types/api.ts'

async function send<T>(url: string, payload: object, fallback: string) {
  try {
    const response = await request.post<ApiResponse<T>>(url, payload)
    const body = response.data
    if (!body || body.code !== 0) {
      throw new Error(body?.message ? `${fallback}：${body.message}` : fallback)
    }
    return body.data
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) throw error
    throw new Error(fallback)
  }
}

export async function updateAccount(accountId: number, values: AccountUpdateValues) {
  await send<null>('/api/account/update', {
    accountId,
    username: values.username.trim(),
    ...(values.password ? { password: values.password } : {}),
  }, '保存用户失败')
}

export async function fetchAccountProjects(accountId: number): Promise<AccountMembership[]> {
  const data = await send<AccountMembership[]>('/api/account/project/list', { accountId }, '获取项目关联失败')
  if (!Array.isArray(data) || data.some((item) => !item || !Number.isSafeInteger(item.projectId) || item.projectId <= 0 || !Number.isSafeInteger(item.roleId) || item.roleId <= 0)) {
    throw new Error('获取项目关联失败')
  }
  return data
}

export async function updateAccountProjects(accountId: number, memberships: AccountMembership[]) {
  await send<null>('/api/account/project/update', { accountId, memberships }, '保存项目关联失败')
}
