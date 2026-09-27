import axios from 'axios'
import { request } from '@/services/request.ts'
import type { ApiResponse, ProjectSwitchData } from '@/types/api.ts'

const PROJECT_SWITCH_URL = '/api/project/switch'

export async function switchProject(projectId: number) {
  try {
    const response = await request.post<ApiResponse<ProjectSwitchData>>(PROJECT_SWITCH_URL, {
      projectId,
    })
    const body = response.data
    if (!body || body.code !== 0 || !body.data) {
      throw new Error(body?.message || '切换项目失败')
    }
    return body.data
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) {
      throw error
    }
    if (axios.isAxiosError<ApiResponse<ProjectSwitchData>>(error)) {
      const message = error.response?.data?.message
      if (message) {
        throw new Error(message)
      }
    }
    throw new Error('切换项目失败')
  }
}
