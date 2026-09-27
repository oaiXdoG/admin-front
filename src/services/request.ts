import axios from 'axios'
import { clearSession, getSession } from '@/stores/session.ts'

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
  const token = getSession()?.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use((response) => {
  if (response.data?.code === 100003) {
    clearSession()
  }
  return response
})
