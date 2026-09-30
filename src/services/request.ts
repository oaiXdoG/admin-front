import axios from 'axios'
import { clearSession, getSession } from '@/stores/session.ts'
import { failProjectChange, getProjectContext, getProjectSignal } from '@/stores/project-context.ts'

export const request = axios.create({
  baseURL: '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

request.interceptors.request.use((config) => {
  const url = config.url ?? ''
  if (url.endsWith('api/login')) {
    return config
  }
  const context = getProjectContext()
  const contextEndpoints = ['/api/project/list', '/api/project/switch', '/api/access/menu']
  if (context.phase !== 'ready' && !contextEndpoints.includes(url)) {
    throw new Error(context.message || '项目正在切换，请稍后重试')
  }
  const token = getSession()?.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function postProject<T>(url: string, body: Record<string, unknown> = {}, options: { allowLoading?: boolean; allowNoProject?: boolean } = {}) {
  const context = getProjectContext()
  if (!url.startsWith('/api/')) throw new Error('项目请求必须使用管理后台接口')
  if (context.phase !== 'ready' && !(options.allowLoading && context.phase === 'loading')) {
    throw new Error(context.message || '请先完成项目切换')
  }
  if (context.projectId === null && !options.allowNoProject) throw new Error('请先选择项目')
  if (Object.hasOwn(body, 'projectId') && body.projectId !== context.projectId) {
    throw new Error('请求项目与当前项目不一致，请切换到正确项目后重试')
  }
  const response = await request.post<T>(url, { ...body, projectId: context.projectId }, { signal: getProjectSignal() })
  if (context.revision !== getProjectContext().revision) throw new axios.CanceledError('项目已切换，忽略旧请求结果')
  const result = response.data as { code?: number; message?: string } | null
  if (result?.code === 100027) {
    const message = result.message || '请求项目与当前项目不一致，请切换到正确项目后重试'
    failProjectChange(message, true)
    throw new Error(message)
  }
  return response
}

request.interceptors.response.use((response) => {
  if (response.data?.code === 100003) {
    clearSession()
  }
  return response
})
