import {
  AppstoreOutlined,
  CloseOutlined,
  DownOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
} from '@ant-design/icons'
import { App, Breadcrumb, Dropdown, Form, Input, Layout, Menu, Modal, Select } from 'antd'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import type { LayoutOutletContext, ProjectCreateValues } from '@/layouts/context.ts'
import { createProject } from '@/services/project-create.ts'
import { fetchProjectList } from '@/services/project-list.ts'
import { switchProject } from '@/services/project-switch.ts'
import { fetchAccessMenus } from '@/services/access-menu.ts'
import { findRouteByName, findRouteByPath, type AppRoutePath } from '@/router/routes.ts'
import { clearSession, useSession } from '@/stores/session.ts'
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
  const [projects, setProjects] = useState<ProjectListData | null>(null)
  const [accessMenus, setAccessMenus] = useState<MenuRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768)
  const [openKeys, setOpenKeys] = useState(['/manage'])
  const [tabs, setTabs] = useState<AppRoutePath[]>([])
  const [form] = Form.useForm<ProjectCreateValues>()

  useEffect(() => {
    if (!session) {
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all([fetchProjectList(), fetchAccessMenus()])
      .then(([projectData, menuData]) => {
        if (!cancelled) {
          setProjects(projectData)
          setAccessMenus(menuData)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          message.error(errorMessage(error, '获取项目列表失败'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [session])

  const current = projects?.projects.find((item) => item.projectId === projects.currentProjectId)
  const currentRoute = findRouteByPath(location.pathname)
  const allowedPaths = new Set<AppRoutePath>()
  for (const menu of accessMenus) {
    const route = findRouteByName(menu.routeName) ?? findRouteByPath(menu.routePath)
    if (route) {
      allowedPaths.add(route.path)
    }
  }
  const canManage = allowedPaths.has('/manage/project')
  useEffect(() => {
    if (loading || !currentRoute || allowedPaths.has(currentRoute.path)) {
      return
    }
    if (canManage) {
      navigate('/manage/project', { replace: true })
      return
    }
    navigate('/', { replace: true, state: { blank: true } })
  }, [location.pathname, canManage, loading])

  useEffect(() => {
    if (!currentRoute || !allowedPaths.has(currentRoute.path)) {
      return
    }
    setTabs((prev) => (prev.includes(currentRoute.path) ? prev : [...prev, currentRoute.path]))
  }, [location.pathname, canManage])

  if (!session) {
    return null
  }

  const mustCreate = canManage && projects !== null && projects.projects.length === 0
  const createVisible = mustCreate || createOpen

  async function onSwitch(projectId: number) {
    if (!projects || projectId === projects.currentProjectId) {
      return
    }
    setSwitching(true)
    try {
      await switchProject(projectId)
      const [projectData, menuData] = await Promise.all([fetchProjectList(), fetchAccessMenus()])
      setProjects(projectData)
      setAccessMenus(menuData)
    } catch (error) {
      message.error(errorMessage(error, '切换项目失败'))
    } finally {
      setSwitching(false)
    }
  }

  async function onCreate(values: ProjectCreateValues) {
    setCreating(true)
    try {
      await createProject(values.name)
      const [projectData, menuData] = await Promise.all([fetchProjectList(), fetchAccessMenus()])
      setProjects(projectData)
      setAccessMenus(menuData)
      setCreateOpen(false)
      form.resetFields()
      message.success('项目已创建')
      if (location.pathname !== '/manage/project') {
        navigate('/manage/project')
      }
    } catch (error) {
      message.error(errorMessage(error, '创建项目失败'))
    } finally {
      setCreating(false)
    }
  }

  function openRoute(path: string) {
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
    creating,
    createOpen,
    mustCreate,
    canManage,
    onOpenCreate: () => setCreateOpen(true),
    onCloseCreate: () => setCreateOpen(false),
    onCreate,
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
              disabled={loading || switching || !projects || projects.projects.length === 0}
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
                <button type="button" onClick={() => navigate(path)}>
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
          <Outlet context={outletContext} />
        </Layout.Content>
      </Layout>
      <Modal
        title="新建项目"
        open={createVisible}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
        closable={!mustCreate}
        maskClosable={!mustCreate}
        keyboard={!mustCreate}
        cancelButtonProps={mustCreate ? { style: { display: 'none' } } : undefined}
        onOk={() => form.submit()}
        onCancel={() => {
          if (!mustCreate) {
            form.resetFields()
            setCreateOpen(false)
          }
        }}
      >
        <Form form={form} layout="vertical" requiredMark={false} onFinish={onCreate}>
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
