import { useState } from 'react'
import { Outlet, useOutletContext } from 'react-router'
import type { LayoutOutletContext } from '@/layouts/context.ts'
import { QueryWorkspace, TemplateManager } from './workspace.tsx'
import type { Category, Template } from './workspace.tsx'

type DataCenterContext = {
  projectId: number | null
  revision: number
  templates: Template[]
  save: (template: Template) => void
  remove: (id: number) => void
}

export function DataCenterLayout() {
  const { projects, projectRevision } = useOutletContext<LayoutOutletContext>()
  const [templates, setTemplates] = useState<Template[]>([])
  const context: DataCenterContext = {
    projectId: projects?.currentProjectId ?? null,
    revision: projectRevision,
    templates,
    save: (template) => setTemplates((items) => [...items.filter((item) => item.id !== template.id), template]),
    remove: (id) => setTemplates((items) => items.filter((item) => item.id !== id)),
  }
  return <Outlet context={context} />
}

export function DataQueryPage({ category }: { category: Category }) {
  const { projectId, revision, templates } = useOutletContext<DataCenterContext>()
  return <QueryWorkspace key={`${projectId}-${revision}-${category}`} category={category} templates={templates.filter((item) => item.projectId === projectId)} />
}

export function QueryTemplatePage() {
  const { projectId, revision, templates, save, remove } = useOutletContext<DataCenterContext>()
  if (projectId === null) return <div className="admin-empty">请选择项目</div>
  return <TemplateManager key={`${projectId}-${revision}`} projectId={projectId} templates={templates.filter((item) => item.projectId === projectId)} onSave={save} onRemove={remove} />
}
