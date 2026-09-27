import axios from 'axios'
import { request } from '@/services/request.ts'
import type { ApiResponse } from '@/types/api.ts'

async function command(url: string, body: { projectId: number; appKey?: string; name?: string }, fallback: string) {
  try {
    const response = await request.post<ApiResponse<null>>(url, body)
    if (!response.data || response.data.code !== 0) {
      throw new Error(response.data?.message || fallback)
    }
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) throw error
    if (axios.isAxiosError<ApiResponse<null>>(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error(fallback)
  }
}

export function updateProject(projectId: number, values: { appKey: string; name: string }) {
  return command('/api/project/update', { projectId, appKey: values.appKey.trim(), name: values.name.trim() }, '修改项目失败')
}

export function closeProject(projectId: number) {
  return command('/api/project/close', { projectId }, '关闭项目失败')
}
