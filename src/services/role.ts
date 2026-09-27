import axios from 'axios'
import { request } from '@/services/request.ts'
import type { ApiResponse, RoleMenuData, RoleRecord } from '@/types/api.ts'

function read<T>(response: { data: ApiResponse<T> }, fallback: string) {
  const body = response.data
  if (!body || body.code !== 0 || body.data === null) {
    throw new Error(body?.message || fallback)
  }
  return body.data
}

function failure(error: unknown, fallback: string): never {
  if (error instanceof Error && !axios.isAxiosError(error)) throw error
  if (axios.isAxiosError<ApiResponse<unknown>>(error) && error.response?.data?.message) {
    throw new Error(error.response.data.message)
  }
  throw new Error(fallback)
}

export async function fetchRoles() {
  try {
    return read(await request.post<ApiResponse<RoleRecord[]>>('/api/role/list', {}), '获取角色失败')
  } catch (error) { failure(error, '获取角色失败') }
}

export async function createRole(body: { name: string; code: string; description: string; status: number }) {
  try {
    return read(await request.post<ApiResponse<RoleRecord>>('/api/role/create', { ...body, name: body.name.trim(), code: body.code.trim(), description: body.description.trim() }), '创建角色失败')
  } catch (error) { failure(error, '创建角色失败') }
}

export async function updateRole(roleId: number, body: { name: string; code: string; description: string; status: number }) {
  try {
    return read(await request.post<ApiResponse<RoleRecord>>('/api/role/update', { roleId, ...body, name: body.name.trim(), code: body.code.trim(), description: body.description.trim() }), '修改角色失败')
  } catch (error) { failure(error, '修改角色失败') }
}

export async function removeRole(roleId: number) {
  try {
    read(await request.post<ApiResponse<null>>('/api/role/remove', { roleId }), '删除角色失败')
  } catch (error) { failure(error, '删除角色失败') }
}

export async function fetchRoleMenus(roleId: number) {
  try {
    return read(await request.post<ApiResponse<RoleMenuData>>('/api/role/menu/list', { roleId }), '获取角色权限失败')
  } catch (error) { failure(error, '获取角色权限失败') }
}

export async function updateRoleMenus(roleId: number, menuIds: number[]) {
  try {
    read(await request.post<ApiResponse<null>>('/api/role/menu/update', { roleId, menuIds }), '保存角色权限失败')
  } catch (error) { failure(error, '保存角色权限失败') }
}
