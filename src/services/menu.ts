import axios from 'axios'
import { request } from '@/services/request.ts'
import type { ApiResponse, MenuRecord, MenuWrite } from '@/types/api.ts'

const MENU_LIST_URL = '/api/menu/list'
const MENU_CREATE_URL = '/api/menu/create'
const MENU_UPDATE_URL = '/api/menu/update'
const MENU_REMOVE_URL = '/api/menu/remove'

async function readMenu<T>(response: { data: ApiResponse<T> }, fallback: string) {
  const body = response.data
  if (!body || body.code !== 0) {
    throw new Error(body?.message || fallback)
  }
  return body
}

function readError(error: unknown, fallback: string): never {
  if (error instanceof Error && !axios.isAxiosError(error)) {
    throw error
  }
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const message = error.response?.data?.message
    if (message) {
      throw new Error(message)
    }
  }
  throw new Error(fallback)
}

export async function fetchMenuList() {
  try {
    const response = await request.post<ApiResponse<{ list: MenuRecord[] }>>(MENU_LIST_URL, {})
    const body = await readMenu(response, '获取菜单失败')
    return body.data?.list ?? []
  } catch (error) {
    readError(error, '获取菜单失败')
  }
}

export async function createMenu(body: MenuWrite) {
  try {
    const response = await request.post<ApiResponse<MenuRecord>>(MENU_CREATE_URL, body)
    const result = await readMenu(response, '新增菜单失败')
    if (!result.data) {
      throw new Error(result.message || '新增菜单失败')
    }
    return result.data
  } catch (error) {
    readError(error, '新增菜单失败')
  }
}

export async function updateMenu(menuId: number, body: MenuWrite) {
  try {
    const response = await request.post<ApiResponse<MenuRecord>>(MENU_UPDATE_URL, { menuId, ...body })
    const result = await readMenu(response, '修改菜单失败')
    if (!result.data) {
      throw new Error(result.message || '修改菜单失败')
    }
    return result.data
  } catch (error) {
    readError(error, '修改菜单失败')
  }
}

export async function removeMenu(menuId: number) {
  try {
    const response = await request.post<ApiResponse<null>>(MENU_REMOVE_URL, { menuId })
    await readMenu(response, '删除菜单失败')
  } catch (error) {
    readError(error, '删除菜单失败')
  }
}
