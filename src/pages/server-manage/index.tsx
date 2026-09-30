import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Outlet, useOutletContext } from 'react-router'
import type { LayoutOutletContext } from '@/layouts/context.ts'
import { ProcessWorkspace } from './processes.tsx'
import type { ManagedProcess } from './processes.tsx'

type ProcessContext = { projectId: number | null; revision: number; project: string; processes: ManagedProcess[]; setProcesses: Dispatch<SetStateAction<ManagedProcess[]>> }

export function ServerManageLayout() {
  const { projects, projectRevision } = useOutletContext<LayoutOutletContext>()
  const [processesByProject, setProcessesByProject] = useState<Record<number, ManagedProcess[]>>({})
  const projectId = projects?.currentProjectId ?? null
  const project = projects?.projects.find((item) => item.projectId === projectId)
  const context: ProcessContext = {
    projectId,
    revision: projectRevision,
    project: project?.name ?? '',
    processes: projectId === null ? [] : processesByProject[projectId] ?? [],
    setProcesses: (update) => {
      if (projectId === null) return
      setProcessesByProject((previous) => ({ ...previous, [projectId]: typeof update === 'function' ? update(previous[projectId] ?? []) : update }))
    },
  }
  return <Outlet context={context} />
}

export function ServerManagePage({ mode }: { mode: 'monitor' | 'operations' }) {
  const { projectId, revision, project, processes, setProcesses } = useOutletContext<ProcessContext>()
  if (projectId === null) return <div className="admin-empty">请选择项目</div>
  return <ProcessWorkspace key={`${projectId}-${revision}`} mode={mode} project={project} processes={processes} onChange={setProcesses} />
}
