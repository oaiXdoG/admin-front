import axios from 'axios'
import { postProject } from '@/services/request.ts'
import type { ApiResponse, MenuRecord } from '@/types/api.ts'

const ACCESS_MENU_URL = '/api/access/menu'

export async function fetchAccessMenus() {
  try {
    const response = await postProject<ApiResponse<MenuRecord[]>>(ACCESS_MENU_URL, {}, { allowLoading: true, allowNoProject: true })
    const body = response.data
    if (!body || body.code !== 0 || !body.data) {
      throw new Error(body?.message || '获取权限菜单失败')
    }
    return body.data
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) {
      throw error
    }
    if (axios.isAxiosError<ApiResponse<MenuRecord[]>>(error)) {
      const message = error.response?.data?.message
      if (message) {
        throw new Error(message)
      }
    }
    throw new Error('获取权限菜单失败')
  }
}
