import axios from 'axios'
import { request } from '@/services/request.ts'
import type { ApiResponse, ProjectListData } from '@/types/api.ts'

const PROJECT_LIST_URL = '/api/project/list'

export async function fetchProjectList() {
  try {
    const response = await request.post<ApiResponse<ProjectListData>>(PROJECT_LIST_URL, {})
    const body = response.data
    if (!body || body.code !== 0 || !body.data) {
      throw new Error(body?.message || '获取项目列表失败')
    }
    return body.data
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) {
      throw error
    }
    if (axios.isAxiosError<ApiResponse<ProjectListData>>(error)) {
      const message = error.response?.data?.message
      if (message) {
        throw new Error(message)
      }
    }
    throw new Error('获取项目列表失败')
  }
}
