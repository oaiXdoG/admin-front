import { useSyncExternalStore } from 'react'

type ProjectPhase = 'loading' | 'ready' | 'mismatch' | 'error'
type ProjectContext = { projectId: number | null; phase: ProjectPhase; revision: number; message: string }

let current: ProjectContext = { projectId: null, phase: 'loading', revision: 0, message: '' }
let controller = new AbortController()
const listeners = new Set<() => void>()

function change(projectId: number | null, phase: ProjectPhase, message = '') {
  controller.abort()
  controller = new AbortController()
  current = { projectId, phase, revision: current.revision + 1, message }
  listeners.forEach((listener) => listener())
}

export function getProjectContext() { return current }
export function getProjectSignal() { return controller.signal }
export function beginProjectChange() { change(current.projectId, 'loading') }
export function prepareProjectContext(projectId: number | null) { change(projectId, 'loading') }
export function resetProjectContext() { change(null, 'loading') }

export function completeProjectChange() {
  current = { ...current, phase: 'ready', message: '' }
  listeners.forEach((listener) => listener())
}

export function failProjectChange(message: string, mismatch = false) {
  change(current.projectId, mismatch ? 'mismatch' : 'error', message)
}

export function useProjectContext() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, getProjectContext, getProjectContext)
}
