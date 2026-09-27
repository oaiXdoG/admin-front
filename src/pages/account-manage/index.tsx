import { App, Button, Card, Form, Input, Modal, Pagination, Space, Table } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { createAccount } from '@/services/account-create.ts'
import { fetchAccounts } from '@/services/account-list.ts'
import type { AccountRecord } from '@/types/api.ts'

type CreateValues = { account: string; password: string; username: string }

export function AccountManagePage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<CreateValues>()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const pageSize = 10

  async function load() {
    setLoading(true)
    try { setAccounts(await fetchAccounts()) } catch (error) { message.error(error instanceof Error ? error.message : '获取用户失败') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const rows = useMemo(() => accounts.filter((item) => !keyword || `${item.account} ${item.username}`.toLowerCase().includes(keyword.toLowerCase())), [accounts, keyword])
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize)

  async function onCreate(values: CreateValues) {
    setCreating(true)
    try { await createAccount(values); message.success('账号已创建'); setOpen(false); form.resetFields(); await load() }
    catch (error) { message.error(error instanceof Error ? error.message : '创建账号失败') }
    finally { setCreating(false) }
  }

  return <div className="admin-page">
    <Card className="admin-card admin-filter-card" variant="borderless" title="搜索">
      <Form layout="inline" className="admin-filter-form" onFinish={() => { setPage(1) }}>
        <Form.Item label="账号/显示名"><Input allowClear value={keyword} placeholder="请输入账号或显示名" onChange={(event) => { setKeyword(event.target.value); setPage(1) }} /></Form.Item>
        <Form.Item className="admin-filter-actions"><Space><Button onClick={() => { setKeyword(''); setPage(1) }}>重置</Button><Button type="primary" htmlType="submit">搜索</Button></Space></Form.Item>
      </Form>
    </Card>
    <Card className="admin-card admin-table-card" variant="borderless" title="用户列表" extra={<Space><Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增</Button><Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button></Space>}>
      <Table<AccountRecord> className="admin-selection-table" rowKey="id" tableLayout="fixed" loading={loading} pagination={false} dataSource={visibleRows} rowSelection={{ columnWidth: 72, selectedRowKeys, onChange: setSelectedRowKeys }} columns={[
        { title: '序号', className: 'admin-index-column', width: 96, align: 'center' as const, render: (_, __, index) => (page - 1) * pageSize + index + 1 },
        { title: '用户 ID', dataIndex: 'id', width: 120, align: 'center' as const },
        { title: '登录名', dataIndex: 'account', width: 260, ellipsis: true },
        { title: '显示名', dataIndex: 'username', ellipsis: true },
        { title: '操作', width: 150, align: 'center' as const, render: () => <Button type="link" disabled>编辑</Button> },
      ]} />
      <div className="admin-pagination"><Pagination current={page} pageSize={pageSize} total={rows.length} showSizeChanger={false} showTotal={(total) => `共 ${total} 条`} onChange={setPage} /></div>
    </Card>
    <Modal title="新增账号" open={open} okText="创建" cancelText="取消" confirmLoading={creating} onOk={() => form.submit()} onCancel={() => { form.resetFields(); setOpen(false) }}>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={onCreate}>
        <Form.Item label="登录名" name="account" rules={[{ required: true, whitespace: true, message: '请输入登录名' }, { max: 64, message: '登录名最长 64 位' }]}><Input maxLength={64} autoComplete="off" /></Form.Item>
        <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }, { max: 128, message: '密码最长 128 位' }]}><Input.Password maxLength={128} autoComplete="new-password" /></Form.Item>
        <Form.Item label="显示名" name="username" rules={[{ required: true, whitespace: true, message: '请输入显示名' }, { max: 64, message: '显示名最长 64 位' }]}><Input maxLength={64} /></Form.Item>
      </Form>
    </Modal>
  </div>
}
