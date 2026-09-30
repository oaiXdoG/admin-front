import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, useLocation, useOutletContext } from 'react-router'
import type { LayoutOutletContext } from '@/layouts/context.ts'
import { BasicLayout } from '@/layouts/index.ts'
import { AccountManagePage } from '@/pages/account-manage/index.tsx'
import { LoginPage } from '@/pages/login/index.tsx'
import { MenuManagePage } from '@/pages/menu-manage/index.tsx'
import { NotFoundPage } from '@/pages/not-found/index.tsx'
import { ProjectManagePage } from '@/pages/project-manage/index.tsx'
import { RoleManagePage } from '@/pages/role-manage/index.tsx'
import { DataCenterLayout, DataQueryPage, QueryTemplatePage } from '@/pages/data-center/index.tsx'
import { ServerManageLayout, ServerManagePage } from '@/pages/server-manage/index.tsx'
import { useSession } from '@/stores/session.ts'

function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()
  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    )
  }
  return children
}

function GuestOnly({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()
  if (session) {
    const from = (location.state as { from?: unknown } | null)?.from
    const destination = typeof from === 'string' && from.startsWith('/') ? from : '/'
    return <Navigate to={destination} replace />
  }
  return children
}

function HomeRedirect() {
  const location = useLocation()
  const { loading, canManage } = useOutletContext<LayoutOutletContext>()
  if (location.state && (location.state as { blank?: boolean }).blank) {
    return <div className="admin-empty">请从左侧菜单进入</div>
  }
  if (loading) {
    return null
  }
  if (canManage) {
    return <Navigate to="/manage/project" replace />
  }
  return <div className="admin-empty">还没有可进入的页面</div>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <BasicLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'manage', element: <Navigate to="/manage/project" replace /> },
      { path: 'manage/user', element: <AccountManagePage /> },
      { path: 'manage/role', element: <RoleManagePage /> },
      { path: 'manage/menu', element: <MenuManagePage /> },
      { path: 'manage/project', element: <ProjectManagePage /> },
      { path: 'server', element: <ServerManageLayout />, children: [
        { index: true, element: <div className="admin-empty">请从左侧菜单进入</div> },
        { path: 'monitor', element: <ServerManagePage mode="monitor" /> },
        { path: 'operations', element: <ServerManagePage mode="operations" /> },
      ] },
      { path: 'data', element: <DataCenterLayout />, children: [
        { index: true, element: <div className="admin-empty">请从左侧菜单进入</div> },
        { path: 'query', element: <DataQueryPage category="data" /> },
        { path: 'log', element: <DataQueryPage category="log" /> },
        { path: 'template', element: <QueryTemplatePage /> },
      ] },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
