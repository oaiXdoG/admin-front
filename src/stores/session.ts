import { useSyncExternalStore } from 'react'
import type { LoginData } from '@/types/api.ts'
import { resetProjectContext } from './project-context.ts'

const STORAGE_KEY = 'session'

let current = readStoredSession()
const listeners = new Set<() => void>()

function readStoredSession(): LoginData | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as LoginData
    if (!parsed?.token) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function emit() {
  listeners.forEach((listener) => listener())
}

export function getSession() {
  return current
}

export function saveSession(session: LoginData) {
  resetProjectContext()
  current = session
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  emit()
}

export function clearSession() {
  resetProjectContext()
  current = null
  localStorage.removeItem(STORAGE_KEY)
  emit()
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession, () => null)
}
