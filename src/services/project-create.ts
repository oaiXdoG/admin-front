import axios from 'axios'
import { request } from '@/services/request.ts'
import type { ApiResponse, ProjectCreateData } from '@/types/api.ts'

const PROJECT_CREATE_URL = '/api/project/create'

export async function createProject(name: string) {
  try {
    const response = await request.post<ApiResponse<ProjectCreateData>>(PROJECT_CREATE_URL, {
      name: name.trim(),
    })
    const body = response.data
    if (!body || body.code !== 0 || !body.data) {
      throw new Error(body?.message || '创建项目失败')
    }
    return body.data
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) {
      throw error
    }
    if (axios.isAxiosError<ApiResponse<ProjectCreateData>>(error)) {
      const message = error.response?.data?.message
      if (message) {
        throw new Error(message)
      }
    }
    throw new Error('创建项目失败')
  }
}
