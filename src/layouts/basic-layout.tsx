import {
  AppstoreOutlined,
  CloseOutlined,
  DownOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
} from '@ant-design/icons'
import { Alert, App, Breadcrumb, Button, Dropdown, Form, Input, Layout, Menu, Modal, Select, Space, Spin } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import type { LayoutOutletContext, ProjectCreateValues } from '@/layouts/context.ts'
import { createProject } from '@/services/project-create.ts'
import { fetchProjectList } from '@/services/project-list.ts'
import { switchProject } from '@/services/project-switch.ts'
import { fetchAccessMenus } from '@/services/access-menu.ts'
import { findRouteByName, findRouteByPath, type AppRoutePath } from '@/router/routes.ts'
import { clearSession, useSession } from '@/stores/session.ts'
import { beginProjectChange, completeProjectChange, failProjectChange, getProjectContext, prepareProjectContext, useProjectContext } from '@/stores/project-context.ts'
import type { MenuRecord, ProjectListData } from '@/types/api.ts'
import './basic-layout.css'

function initials(name: string) {
  const text = name.trim()
  return text ? text.slice(0, 1).toUpperCase() : '?'
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

type MenuItemNode = {
  key: string
  label: string
  icon?: ReactNode
  children?: MenuItemNode[]
}

function menuKey(menu: MenuRecord) {
  return menu.routePath || menu.routeName || String(menu.id)
}

function buildMenuItems(rows: MenuRecord[]): MenuItemNode[] {
  const byParent = new Map<number, MenuRecord[]>()
  for (const row of rows) {
    const parentId = row.parentId || 0
    const children = byParent.get(parentId) ?? []
    children.push(row)
    byParent.set(parentId, children)
  }
  const build = (parentId: number): MenuItemNode[] => (byParent.get(parentId) ?? [])
    .filter((row) => !row.hidden)
    .map((row) => {
      const children = build(row.id)
      return {
        key: menuKey(row),
        label: row.name,
        icon: row.menuType === 1 ? <AppstoreOutlined /> : undefined,
        children: children.length ? children : undefined,
      }
    })
  return build(0)
}

export function BasicLayout() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSession()
  const projectContext = useProjectContext()
  const syncSequence = useRef(0)
  const [projects, setProjects] = useState<ProjectListData | null>(null)
  const [accessMenus, setAccessMenus] = useState<MenuRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768)
  const [openKeys, setOpenKeys] = useState(['/manage'])
  const [tabs, setTabs] = useState<AppRoutePath[]>([])
  const [form] = Form.useForm<ProjectCreateValues>()

  useEffect(() => {
    if (projectContext.phase !== 'ready') Modal.destroyAll()
  }, [projectContext.phase])

  const synchronizeProjects = useCallback(async (sequence: number, expectedProjectId?: number) => {
    const projectData = await fetchProjectList()
    if (sequence !== syncSequence.current) return
    if (expectedProjectId !== undefined && projectData.currentProjectId !== expectedProjectId) {
      setProjects({ ...projectData, currentProjectId: expectedProjectId })
      prepareProjectContext(expectedProjectId)
      const text = '项目已发生变化，请重新切换到正确项目后重试'
      failProjectChange(text, true)
      throw new Error(text)
    }
    setProjects(projectData)
    prepareProjectContext(projectData.currentProjectId)
    const menuData = await fetchAccessMenus()
    if (sequence !== syncSequence.current) return
    setAccessMenus(menuData)
    completeProjectChange()
    setInitialized(true)
  }, [])

  function reportProjectError(error: unknown, fallback: string) {
    const text = errorMessage(error, fallback)
    if (getProjectContext().phase !== 'mismatch') failProjectChange(text)
    setAccessMenus([])
    message.error(text)
  }

  useEffect(() => {
    if (!session) {
      return
    }
    const sequence = ++syncSequence.current
    beginProjectChange()
    setLoading(true)
    setInitialized(false)
    void synchronizeProjects(sequence)
      .catch((error: unknown) => {
        if (sequence === syncSequence.current) {
          const text = errorMessage(error, '获取项目信息失败')
          if (getProjectContext().phase !== 'mismatch') failProjectChange(text)
          setAccessMenus([])
          message.error(text)
        }
      })
      .finally(() => {
        if (sequence === syncSequence.current) {
          setLoading(false)
        }
      })
    return () => {
      syncSequence.current++
    }
  }, [session, synchronizeProjects, message])

  const current = projects?.projects.find((item) => item.projectId === projects.currentProjectId)
  const currentRoute = findRouteByPath(location.pathname)
  const allowedPaths = useMemo(() => {
    const paths = new Set<AppRoutePath>()
    for (const menu of accessMenus) {
      const route = findRouteByName(menu.routeName) ?? findRouteByPath(menu.routePath)
      if (route) paths.add(route.path)
    }
    return paths
  }, [accessMenus])
  const canManage = allowedPaths.has('/manage/project')
  useEffect(() => {
    if (loading || switching || projectContext.phase !== 'ready' || !currentRoute || allowedPaths.has(currentRoute.path)) {
      return
    }
    if (canManage) {
      navigate('/manage/project', { replace: true })
      return
    }
    navigate('/', { replace: true, state: { blank: true } })
  }, [currentRoute, canManage, allowedPaths, loading, switching, projectContext.phase, navigate])

  useEffect(() => {
    if (loading || switching || projectContext.phase !== 'ready') return
    setTabs((previous) => {
      const next = previous.filter((path) => allowedPaths.has(path))
      if (currentRoute && allowedPaths.has(currentRoute.path) && !next.includes(currentRoute.path)) next.push(currentRoute.path)
      return next.join(',') === previous.join(',') ? previous : next
    })
  }, [currentRoute, allowedPaths, loading, switching, projectContext.phase])

  if (!session) {
    return null
  }

  const mustCreate = projectContext.phase === 'ready' && canManage && projects !== null && projects.projects.length === 0
  const createVisible = mustCreate || createOpen

  async function refreshProjects() {
    const sequence = ++syncSequence.current
    beginProjectChange()
    setLoading(true)
    try {
      await synchronizeProjects(sequence)
    } catch (error) {
      if (sequence === syncSequence.current) reportProjectError(error, '获取项目信息失败')
    } finally {
      if (sequence === syncSequence.current) setLoading(false)
    }
  }

  async function onSwitch(projectId: number) {
    if (!projects || switching || loading || creating || (projectId === projects.currentProjectId && projectContext.phase === 'ready')) {
      return
    }
    const sequence = ++syncSequence.current
    beginProjectChange()
    setSwitching(true)
    setLoading(true)
    try {
      const switched = await switchProject(projectId)
      if (sequence !== syncSequence.current) return
      if (switched.currentProjectId !== projectId) throw new Error('服务器返回的项目不一致，请重新切换项目')
      setProjects((previous) => previous ? { ...previous, currentProjectId: projectId } : previous)
      prepareProjectContext(projectId)
      await synchronizeProjects(sequence, projectId)
    } catch (error) {
      if (sequence === syncSequence.current) reportProjectError(error, '切换项目失败')
    } finally {
      if (sequence === syncSequence.current) {
        setSwitching(false)
        setLoading(false)
      }
    }
  }

  async function onCreate(values: ProjectCreateValues) {
    setCreating(true)
    let sequence: number | undefined
    try {
      const created = await createProject(values.name, values.appKey)
      setCreateOpen(false)
      form.resetFields()
      message.success('项目已创建')
      sequence = ++syncSequence.current
      beginProjectChange()
      setLoading(true)
      setProjects((previous) => ({ currentProjectId: created.projectId, projects: [...(previous?.projects ?? []), { ...created, roleName: created.roleName ?? '' }] }))
      prepareProjectContext(created.projectId)
      await synchronizeProjects(sequence, created.projectId)
      if (location.pathname !== '/manage/project') {
        navigate('/manage/project')
      }
    } catch (error) {
      if (sequence === undefined) message.error(errorMessage(error, '创建项目失败'))
      else if (sequence === syncSequence.current) reportProjectError(error, '项目已创建，请重新切换项目')
    } finally {
      setCreating(false)
      if (sequence !== undefined && sequence === syncSequence.current) setLoading(false)
    }
  }

  function openRoute(path: string) {
    if (loading || switching || projectContext.phase !== 'ready') return
    const route = findRouteByPath(path) ?? findRouteByName(path)
    if (!route || !allowedPaths.has(route.path)) {
      return
    }
    navigate(route.path)
    if (window.innerWidth < 768) {
      setCollapsed(true)
    }
  }

  function closeTab(path: AppRoutePath) {
    const next = tabs.filter((item) => item !== path)
    setTabs(next)
    if (location.pathname !== path) {
      return
    }
    const index = tabs.indexOf(path)
    const fallback = next[index] ?? next[index - 1]
    if (fallback) {
      navigate(fallback)
      return
    }
    navigate('/', { replace: true, state: { blank: true } })
  }

  const menuItems = buildMenuItems(accessMenus)

  const outletContext: LayoutOutletContext = {
    projects,
    loading,
    projectRevision: projectContext.revision,
    creating,
    createOpen,
    mustCreate,
    canManage,
    onOpenCreate: () => setCreateOpen(true),
    onCloseCreate: () => setCreateOpen(false),
    onCreate,
    onRefreshProjects: refreshProjects,
  }

  return (
    <Layout className="admin-shell">
      {!collapsed ? (
        <button className="admin-sider-mask" type="button" aria-label="关闭菜单" onClick={() => setCollapsed(true)} />
      ) : null}
      <Layout.Sider
        className="admin-sider"
        theme="light"
        width={232}
        collapsedWidth={64}
        collapsed={collapsed}
        trigger={null}
      >
        <div className="admin-logo">
          <span className="admin-logo-mark">A</span>
          {collapsed ? null : <span>admin-front</span>}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          onClick={({ key }) => openRoute(key)}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="admin-header">
          <div className="admin-header-main">
            <button className="admin-fold" type="button" onClick={() => setCollapsed((value) => !value)}>
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <Breadcrumb
              items={
                currentRoute
                  ? [{ title: currentRoute.parent }, { title: currentRoute.title }]
                  : []
              }
            />
          </div>
          <div className="admin-header-side">
            <Select
              className="admin-project-select"
              prefix={<ProjectOutlined />}
              placeholder={loading ? '加载中' : '还没有项目'}
              value={projects?.currentProjectId ?? undefined}
              loading={switching}
              disabled={loading || switching || creating || !projects || projects.projects.length === 0}
              options={projects?.projects.map((item) => ({
                value: item.projectId,
                label: item.name,
              }))}
              onChange={(projectId) => {
                void onSwitch(projectId)
              }}
            />
            <Dropdown
              menu={{
                items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出', onClick: clearSession }],
              }}
            >
              <div className="admin-user">
                <span className="admin-logo-mark">{initials(session.username)}</span>
                <span className="admin-user-text">
                  <span className="admin-user-name">{session.username}</span>
                  <span className="admin-user-role">
                    {current?.roleName ?? session.account}
                  </span>
                </span>
                <DownOutlined className="admin-user-arrow" />
              </div>
            </Dropdown>
          </div>
        </Layout.Header>
        <div className="admin-tabs">
          {tabs.map((path) => {
            const route = findRouteByPath(path)
            if (!route) {
              return null
            }
            return (
              <div key={path} className={path === location.pathname ? 'admin-tab is-active' : 'admin-tab'}>
                <button type="button" onClick={() => openRoute(path)}>
                  {route.title}
                </button>
                <button
                  className="admin-tab-close"
                  type="button"
                  aria-label={`关闭${route.title}`}
                  onClick={() => closeTab(path)}
                >
                  <CloseOutlined />
                </button>
              </div>
            )
          })}
        </div>
        <Layout.Content className="admin-content">
          {(loading || switching) && <div className="admin-empty"><Space><Spin /><span>{switching ? '正在切换项目' : '正在加载项目信息'}</span></Space></div>}
          {!loading && !switching && projectContext.phase !== 'ready' && <Alert type="warning" showIcon title="请确认当前项目" description={projectContext.message || '项目状态未确认，请重新选择项目'} action={<Button onClick={() => { if (projects?.currentProjectId != null) void onSwitch(projects.currentProjectId); else void refreshProjects() }}>{current ? `切换到「${current.name}」` : '重新获取项目'}</Button>} />}
          {initialized && <div className="admin-page-content" hidden={loading || switching || projectContext.phase !== 'ready' || (!!currentRoute && !allowedPaths.has(currentRoute.path))}><Outlet context={outletContext} /></div>}
        </Layout.Content>
      </Layout>
      <Modal
        title="新建项目"
        open={createVisible}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
        closable={!mustCreate && !creating}
        maskClosable={!mustCreate && !creating}
        keyboard={!mustCreate && !creating}
        cancelButtonProps={mustCreate ? { style: { display: 'none' } } : undefined}
        onOk={() => form.submit()}
        onCancel={() => {
          if (!mustCreate && !creating) {
            form.resetFields()
            setCreateOpen(false)
          }
        }}
      >
        <Form form={form} layout="vertical" requiredMark={false} onFinish={onCreate}>
          <Form.Item
            label="App Key"
            name="appKey"
            rules={[
              { required: true, whitespace: true, message: '请输入 App Key' },
              { max: 64, message: 'App Key 最长 64 位' },
            ]}
          >
            <Input maxLength={64} placeholder="请输入 App Key" />
          </Form.Item>
          <Form.Item
            label="项目名称"
            name="name"
            rules={[
              { required: true, whitespace: true, message: '请输入项目名称' },
              { max: 64, message: '项目名称最长 64 位' },
            ]}
          >
            <Input maxLength={64} placeholder="请输入项目名称" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
