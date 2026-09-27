import { App, Button, Card, Checkbox, Form, Input, Modal, Pagination, Select, Space, Table, Tag, Tree } from 'antd'
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import { useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { createRole, fetchRoleMenus, fetchRoles, removeRole, updateRole, updateRoleMenus } from '@/services/role.ts'
import type { MenuRecord, RoleRecord } from '@/types/api.ts'

function menuTree(menus: MenuRecord[]): DataNode[] {
  const children = new Map<number, MenuRecord[]>()
  for (const menu of menus) {
    const list = children.get(menu.parentId || 0) ?? []
    list.push(menu)
    children.set(menu.parentId || 0, list)
  }
  const build = (parentId: number): DataNode[] => (children.get(parentId) ?? []).map((menu) => ({
    key: menu.id,
    title: `${menu.name}${menu.routeName ? ` (${menu.routeName})` : ''}`,
    children: build(menu.id),
  }))
  return build(0)
}

export function RoleManagePage() {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<{ name: string; code: string; description: string; status: number }>()
  const [searchForm] = Form.useForm<{ keyword?: string; status?: number }>()
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null)
  const [permissionRole, setPermissionRole] = useState<RoleRecord | null>(null)
  const [permissionMenus, setPermissionMenus] = useState<MenuRecord[]>([])
  const [checkedKeys, setCheckedKeys] = useState<Key[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState(['name', 'code', 'description', 'status', 'actions'])
  const [filters, setFilters] = useState<{ keyword: string; status?: number }>({ keyword: '' })
  const [page, setPage] = useState(1)
  const pageSize = 10

  async function load() {
    setLoading(true)
    try { setRoles(await fetchRoles()) } catch (error) { message.error(error instanceof Error ? error.message : '获取角色失败') }
    finally { setLoading(false) }
  }

  async function removeSelected() {
    const removable = roles.filter((role) => selectedRowKeys.includes(role.id) && !role.builtIn)
    if (!removable.length) return
    setSaving(true)
    try {
      for (const role of removable) await removeRole(role.id)
      message.success(`已删除 ${removable.length} 个角色`)
      setSelectedRowKeys([])
      await load()
    } catch (error) { message.error(error instanceof Error ? error.message : '批量删除角色失败') }
    finally { setSaving(false) }
  }

  useEffect(() => { void load() }, [])

  const filteredRoles = useMemo(() => roles.filter((role) => {
    const matchesKeyword = !filters.keyword || role.name.toLowerCase().includes(filters.keyword.toLowerCase())
    const matchesStatus = !filters.status || role.status === filters.status
    return matchesKeyword && matchesStatus
  }), [filters, roles])
  const visibleRoles = filteredRoles.slice((page - 1) * pageSize, page * pageSize)

  function applySearch(values: { keyword?: string; status?: number }) {
    setFilters({ keyword: values.keyword?.trim() ?? '', status: values.status })
    setPage(1)
  }

  function resetSearch() {
    searchForm.resetFields()
    setFilters({ keyword: '' })
    setPage(1)
  }

  async function submitRole(values: { name: string; code: string; description: string; status: number }) {
    setSaving(true)
    try {
      if (editingRole) {
        await updateRole(editingRole.id, values)
        message.success('角色已修改')
      } else {
        await createRole(values)
        message.success('角色已创建')
      }
      setCreateOpen(false)
      setEditingRole(null)
      form.resetFields()
      await load()
    } catch (error) { message.error(error instanceof Error ? error.message : '保存角色失败') }
    finally { setSaving(false) }
  }

  function openEdit(role: RoleRecord) {
    form.setFieldsValue({ name: role.name, code: role.code, description: role.description, status: role.status })
    setEditingRole(role)
    setCreateOpen(true)
  }

  async function openPermissions(role: RoleRecord) {
    try {
      const data = await fetchRoleMenus(role.id)
      setPermissionMenus(data.menus)
      setCheckedKeys(data.menuIds)
      setPermissionRole(role)
    } catch (error) { message.error(error instanceof Error ? error.message : '获取角色权限失败') }
  }

  async function savePermissions() {
    if (!permissionRole) return
    setSaving(true)
    try {
      await updateRoleMenus(permissionRole.id, checkedKeys.map(Number))
      message.success('角色权限已保存')
      setPermissionRole(null)
    } catch (error) { message.error(error instanceof Error ? error.message : '保存角色权限失败') }
    finally { setSaving(false) }
  }

  function confirmRemove(role: RoleRecord) {
    modal.confirm({
      title: '删除角色', content: `删除「${role.name}」？`, okText: '删除', cancelText: '取消',
      onOk: async () => { try { await removeRole(role.id); message.success('角色已删除'); await load() } catch (error) { message.error(error instanceof Error ? error.message : '删除角色失败') } },
    })
  }

  return <div className="admin-page">
    <Card className="admin-card admin-filter-card" variant="borderless" title="搜索">
      <Form form={searchForm} layout="inline" onFinish={applySearch} className="admin-filter-form">
        <Form.Item label="角色名称" name="keyword"><Input allowClear placeholder="请输入角色名称" /></Form.Item>
        <Form.Item label="角色状态" name="status"><Select allowClear placeholder="请选择角色状态" options={[{ value: 1, label: '启用' }, { value: 2, label: '停用' }]} /></Form.Item>
        <Form.Item className="admin-filter-actions"><Space><Button onClick={resetSearch}>重置</Button><Button type="primary" htmlType="submit">搜索</Button></Space></Form.Item>
      </Form>
    </Card>
    <Card className="admin-card admin-table-card" variant="borderless" title="角色列表" extra={<Space size={8}>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setEditingRole(null); setCreateOpen(true) }}>新增</Button>
      <Button danger icon={<DeleteOutlined />} disabled={!selectedRowKeys.length || saving} onClick={() => void removeSelected()}>批量删除</Button>
      <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>
      <Button icon={<SettingOutlined />} onClick={() => setColumnSettingsOpen(true)}>列设置</Button>
    </Space>}>
      <Table<RoleRecord> className="admin-selection-table" rowKey="id" tableLayout="fixed" loading={loading} pagination={false} dataSource={visibleRoles} rowSelection={{ columnWidth: 72, selectedRowKeys, onChange: setSelectedRowKeys }} columns={[
        { title: '序号', className: 'admin-index-column', width: 96, align: 'center' as const, render: (_, __, index) => (page - 1) * pageSize + index + 1 },
        ...(visibleColumns.includes('name') ? [{ title: '角色名称', dataIndex: 'name', width: '22%', align: 'center' as const, ellipsis: true }] : []),
        ...(visibleColumns.includes('code') ? [{ title: '角色编码', dataIndex: 'code', width: '22%', ellipsis: true }] : []),
        ...(visibleColumns.includes('description') ? [{ title: '角色描述', dataIndex: 'description', ellipsis: true }] : []),
        ...(visibleColumns.includes('status') ? [{ title: '角色状态', width: 110, align: 'center' as const, render: (_: unknown, role: RoleRecord) => role.status === 1 ? <Tag color="success">启用</Tag> : <Tag color="warning">停用</Tag> }] : []),
        ...(visibleColumns.includes('actions') ? [{ title: '操作', width: 240, align: 'center' as const, render: (_: unknown, role: RoleRecord) => <Space size={2}><Button type="link" disabled={role.builtIn} onClick={() => openEdit(role)}>编辑</Button><Button type="link" disabled={role.builtIn} onClick={() => void openPermissions(role)}>分配菜单</Button><Button type="link" danger disabled={role.builtIn} onClick={() => confirmRemove(role)}>删除</Button></Space> }] : []),
      ]} />
      <div className="admin-pagination"><Pagination current={page} pageSize={pageSize} total={filteredRoles.length} showSizeChanger={false} showTotal={(total) => `共 ${total} 条`} onChange={setPage} /></div>
    </Card>
    <Modal title="列设置" open={columnSettingsOpen} okText="完成" cancelButtonProps={{ style: { display: 'none' } }} onOk={() => setColumnSettingsOpen(false)} onCancel={() => setColumnSettingsOpen(false)}>
      <Checkbox.Group value={visibleColumns} onChange={(values) => setVisibleColumns(values as string[])} options={[{ label: '角色名称', value: 'name' }, { label: '角色编码', value: 'code' }, { label: '角色描述', value: 'description' }, { label: '角色状态', value: 'status' }, { label: '操作', value: 'actions' }]} />
    </Modal>
    <Modal title={editingRole ? '编辑角色' : '新增角色'} open={createOpen} okText="保存" cancelText="取消" confirmLoading={saving} onOk={() => form.submit()} onCancel={() => { setCreateOpen(false); setEditingRole(null) }}>
      <Form form={form} layout="vertical" onFinish={submitRole} initialValues={{ status: 1 }}>
        <Form.Item label="角色名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入角色名称' }, { max: 32, message: '角色名称最长 32 位' }]}><Input maxLength={32} /></Form.Item>
        <Form.Item label="角色编码" name="code" rules={[{ required: true, whitespace: true, message: '请输入角色编码' }, { max: 64, message: '角色编码最长 64 位' }]}><Input maxLength={64} /></Form.Item>
        <Form.Item label="角色描述" name="description" rules={[{ max: 128, message: '角色描述最长 128 位' }]}><Input.TextArea maxLength={128} rows={3} /></Form.Item>
        <Form.Item label="角色状态" name="status" rules={[{ required: true, message: '请选择角色状态' }]}><Select options={[{ value: 1, label: '启用' }, { value: 2, label: '停用' }]} /></Form.Item>
      </Form>
    </Modal>
    <Modal title={`分配菜单：${permissionRole?.name ?? ''}`} open={permissionRole !== null} okText="保存" cancelText="取消" confirmLoading={saving} onOk={() => void savePermissions()} onCancel={() => setPermissionRole(null)}>
      <Tree checkable checkedKeys={checkedKeys} treeData={menuTree(permissionMenus)} onCheck={(keys) => setCheckedKeys(Array.isArray(keys) ? keys : keys.checked)} />
    </Modal>
  </div>
}
