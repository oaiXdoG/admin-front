import { Alert, App, Button, Card, Empty, Form, Input, Modal, Pagination, Select, Space, Table } from 'antd'
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'
import type { Key } from 'react'
import type { AccountMembership, AccountRecord, AccountUpdateValues, ProjectItem, RoleRecord } from '@/types/api.ts'
import './account-manage.css'

export type AccountCreateValues = { account: string; password: string; username: string }
type Editor = { kind: 'edit' | 'projects'; account: AccountRecord } | null

type Props = {
  accounts: AccountRecord[]
  loading: boolean
  projects: ProjectItem[]
  onReload: () => Promise<void>
  onCreate: (values: AccountCreateValues) => Promise<void>
  loadRoles: () => Promise<RoleRecord[]>
  onUpdate: (accountId: number, values: AccountUpdateValues) => Promise<void>
  loadMemberships: (accountId: number) => Promise<AccountMembership[]>
  onSaveMemberships: (accountId: number, memberships: AccountMembership[]) => Promise<void>
}

export function AccountWorkspace({ accounts, loading, projects, onReload, onCreate, loadRoles, onUpdate, loadMemberships, onSaveMemberships }: Props) {
  const { message } = App.useApp()
  const [createForm] = Form.useForm<AccountCreateValues>()
  const [editForm] = Form.useForm<AccountUpdateValues>()
  const [projectForm] = Form.useForm<{ memberships: AccountMembership[] }>()
  const memberships = Form.useWatch('memberships', projectForm) ?? []
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editor, setEditor] = useState<Editor>(null)
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState('')
  const roleLoadSequence = useRef(0)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const pageSize = 10
  const rows = accounts.filter((account) => `${account.account} ${account.username}`.toLowerCase().includes(keyword.trim().toLowerCase()))
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)))
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const roleOptions = roles.map((role) => ({ value: role.id, label: `${role.name}（${role.code}）${role.status === 1 ? '' : ' · 已停用'}`, disabled: role.status !== 1 }))

  useEffect(() => () => { roleLoadSequence.current++ }, [])

  async function loadProjectAssignments(accountId: number) {
    const sequence = ++roleLoadSequence.current
    setRolesLoading(true)
    setRolesError('')
    try {
      const [result, assigned] = await Promise.all([loadRoles(), loadMemberships(accountId)])
      if (sequence === roleLoadSequence.current) {
        setRoles(result)
        projectForm.setFieldsValue({ memberships: assigned.map((item) => ({ ...item })) })
      }
    } catch {
      if (sequence === roleLoadSequence.current) setRolesError('获取项目关联失败')
    } finally {
      if (sequence === roleLoadSequence.current) setRolesLoading(false)
    }
  }

  function openEditor(kind: NonNullable<Editor>['kind'], account: AccountRecord) {
    editForm.resetFields()
    projectForm.resetFields()
    editForm.setFieldsValue({ username: account.username, password: '' })
    projectForm.setFieldsValue({ memberships: [] })
    setEditor({ kind, account })
    if (kind !== 'edit') void loadProjectAssignments(account.id)
  }

  function closeEditor() {
    roleLoadSequence.current++
    editForm.resetFields()
    projectForm.resetFields()
    setEditor(null)
  }

  async function saveEdit(values: AccountUpdateValues) {
    if (!editor) return
    setSaving(true)
    try {
      await onUpdate(editor.account.id, { username: values.username.trim(), ...(values.password ? { password: values.password } : {}) })
      closeEditor()
      message.success('用户已更新')
      await onReload()
    } catch (error) { message.error(error instanceof Error ? error.message : '保存用户失败') }
    finally { setSaving(false) }
  }

  async function saveProjects(values: { memberships?: AccountMembership[] }) {
    if (!editor || rolesLoading || rolesError) return
    const items = values.memberships ?? []
    if (new Set(items.map((item) => item.projectId)).size !== items.length) { message.error('同一个项目只能关联一次'); return }
    if (items.some((item) => !projects.some((project) => project.projectId === item.projectId) || !roles.some((role) => role.id === item.roleId && role.status === 1))) { message.error('请选择可用的项目和角色'); return }
    setSaving(true)
    try {
      await onSaveMemberships(editor.account.id, items)
      closeEditor()
      message.success('项目关联已保存')
    } catch (error) { message.error(error instanceof Error ? error.message : '保存项目关联失败') }
    finally { setSaving(false) }
  }

  async function create(values: AccountCreateValues) {
    setCreating(true)
    try {
      await onCreate(values)
      setCreateOpen(false)
      createForm.resetFields()
      message.success('账号已创建')
    } catch (error) { message.error(error instanceof Error ? error.message : '创建账号失败') }
    finally { setCreating(false) }
  }

  return <div className="admin-page">
    <Card className="admin-card admin-filter-card" variant="borderless" title="搜索">
      <Form layout="inline" className="admin-filter-form" onFinish={() => setPage(1)}>
        <Form.Item label="账号/显示名"><Input allowClear value={keyword} placeholder="请输入账号或显示名" onChange={(event) => { setKeyword(event.target.value); setPage(1) }} /></Form.Item>
        <Form.Item className="admin-filter-actions"><Space><Button onClick={() => { setKeyword(''); setPage(1) }}>重置</Button><Button type="primary" htmlType="submit">搜索</Button></Space></Form.Item>
      </Form>
    </Card>
    <Card className="admin-card admin-table-card" variant="borderless" title="用户列表" extra={<Space wrap>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新增</Button>
      <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void onReload()}>刷新</Button>
    </Space>}>
      <Table<AccountRecord> className="admin-selection-table" rowKey="id" tableLayout="fixed" loading={loading} pagination={false} scroll={{ x: 1000 }} dataSource={visibleRows} rowSelection={{ columnWidth: 72, selectedRowKeys, onChange: setSelectedRowKeys }} columns={[
        { title: '用户 ID', dataIndex: 'id', width: 120, align: 'center' },
        { title: '登录名', dataIndex: 'account', width: 240, ellipsis: true },
        { title: '显示名', dataIndex: 'username', ellipsis: true },
        { title: '操作', width: 240, align: 'center', render: (_, account) => <Space size={6}><Button type="link" onClick={() => openEditor('edit', account)}>编辑</Button><Button type="link" onClick={() => openEditor('projects', account)}>关联项目</Button></Space> },
      ]} />
      <div className="admin-pagination"><Pagination current={currentPage} pageSize={pageSize} total={rows.length} showSizeChanger={false} showTotal={(total) => `共 ${total} 条`} onChange={setPage} /></div>
    </Card>
    <Modal title="新增账号" open={createOpen} okText="创建" cancelText="取消" confirmLoading={creating} closable={!creating} onOk={() => createForm.submit()} onCancel={() => { if (!creating) { createForm.resetFields(); setCreateOpen(false) } }}>
      <Form form={createForm} layout="vertical" requiredMark={false} onFinish={create}>
        <Form.Item label="登录名" name="account" rules={[{ required: true, whitespace: true, message: '请输入登录名' }, { max: 64, message: '登录名最长 64 位' }]}><Input maxLength={64} autoComplete="off" /></Form.Item>
        <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }, { max: 128, message: '密码最长 128 位' }]}><Input.Password maxLength={128} autoComplete="new-password" /></Form.Item>
        <Form.Item label="显示名" name="username" rules={[{ required: true, whitespace: true, message: '请输入显示名' }, { max: 64, message: '显示名最长 64 位' }]}><Input maxLength={64} /></Form.Item>
      </Form>
    </Modal>
    <Modal title={editor ? `${editor.kind === 'edit' ? '编辑用户' : '关联项目'} · ${editor.account.account}` : ''} open={editor !== null} width={editor?.kind === 'projects' ? 820 : 620} okText="保存" cancelText="取消" confirmLoading={saving} closable={!saving} okButtonProps={{ disabled: editor?.kind === 'projects' && (rolesLoading || !!rolesError) }} onOk={() => { if (editor?.kind === 'edit') editForm.submit(); else projectForm.submit() }} onCancel={() => { if (!saving) closeEditor() }}>
      <div className="account-editor-body">
        {editor?.kind === 'edit' ? <Form form={editForm} layout="vertical" requiredMark={false} onFinish={saveEdit}>
          <div className="account-identity"><span>用户 ID：{editor.account.id}</span><span>登录名：{editor.account.account}</span></div>
          <Form.Item label="显示名" name="username" rules={[{ required: true, whitespace: true, message: '请输入显示名' }, { max: 64, message: '显示名最长 64 位' }]}><Input maxLength={64} /></Form.Item>
          <Form.Item label="新密码" name="password" extra="留空不修改密码" rules={[{ max: 128, message: '密码最长 128 位' }, { validator: (_, value: string | undefined) => !value || value.trim() ? Promise.resolve() : Promise.reject(new Error('密码不能仅包含空格')) }]}><Input.Password maxLength={128} autoComplete="new-password" /></Form.Item>
        </Form> : <>
          {rolesError && <Alert type="error" showIcon title={rolesError} action={editor ? <Button size="small" onClick={() => void loadProjectAssignments(editor.account.id)}>重试</Button> : undefined} />}
          <Form form={projectForm} layout="vertical" requiredMark={false} onFinish={saveProjects}>
            <Form.List name="memberships">{(fields, { add, remove }) => <>
              {fields.map((field) => <div className="account-project-row" key={field.key}>
                <Form.Item label="项目" name={[field.name, 'projectId']} rules={[{ required: true, message: '请选择项目' }]}><Select showSearch optionFilterProp="label" placeholder="选择项目" options={projects.map((project) => ({ value: project.projectId, label: `${project.name}（${project.projectId}）`, disabled: memberships.some((item: AccountMembership, index: number) => index !== field.name && item?.projectId === project.projectId) }))} /></Form.Item>
                <Form.Item label="角色" name={[field.name, 'roleId']} rules={[{ required: true, message: '请选择角色' }]}><Select showSearch optionFilterProp="label" placeholder="选择已有角色" options={roleOptions} loading={rolesLoading} disabled={rolesLoading || !!rolesError} /></Form.Item>
                <Button className="account-remove-project" aria-label="移除项目关联" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
              </div>)}
              {!fields.length && !rolesError && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={rolesLoading ? '加载中' : '暂无项目关联'} />}
              <Button icon={<PlusOutlined />} disabled={!projects.length || fields.length >= projects.length || rolesLoading || !!rolesError} onClick={() => add({})}>添加项目</Button>
            </>}</Form.List>
          </Form>
        </>}
      </div>
    </Modal>
  </div>
}
