import { App, Button, Card, Form, Input, Modal, Pagination, Space, Table } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import type { Key } from 'react'
import dayjs from 'dayjs'
import { useOutletContext } from 'react-router'
import type { LayoutOutletContext, ProjectCreateValues } from '@/layouts/context.ts'
import type { ProjectItem } from '@/types/api.ts'
import { closeProject, updateProject } from '@/services/project-command.ts'

export function ProjectManagePage() {
  const { projects, loading, mustCreate, onOpenCreate, onRefreshProjects } = useOutletContext<LayoutOutletContext>()
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<ProjectCreateValues>()
  const [editing, setEditing] = useState<ProjectItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const rows = useMemo(() => (projects?.projects ?? []).filter((item) => keyword ? item.name.includes(keyword.trim()) : true), [keyword, projects])

  async function refresh() {
    try {
      await onRefreshProjects()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取项目失败')
    }
  }

  function openEdit(project: ProjectItem) {
    form.setFieldsValue({ appKey: project.appKey ?? '', name: project.name })
    setEditing(project)
  }

  async function save(values: ProjectCreateValues) {
    if (!editing) return
    setSaving(true)
    try {
      await updateProject(editing.projectId, values)
      setEditing(null)
      message.success('项目已修改')
      await refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '修改项目失败')
    } finally {
      setSaving(false)
    }
  }

  function confirmClose(project: ProjectItem) {
    modal.confirm({
      title: '关闭项目',
      content: `关闭「${project.name}」后，将不再出现在项目列表中，项目数据仍然保留。`,
      okText: '关闭项目',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await closeProject(project.projectId)
          setSelectedRowKeys((keys) => keys.filter((key) => key !== project.projectId))
          message.success('项目已关闭')
          await refresh()
        } catch (error) {
          message.error(error instanceof Error ? error.message : '关闭项目失败')
          throw error
        }
      },
    })
  }

  return (
    <div className="admin-page">
      <Card className="admin-card" variant="borderless" title="筛选">
        <Input.Search
          allowClear
          placeholder="项目名称"
          onSearch={setKeyword}
          style={{ width: 280 }}
        />
      </Card>
      <Card
        className="admin-card admin-table-card"
        variant="borderless"
        title="项目列表"
        extra={(
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={onOpenCreate} disabled={mustCreate}>新增</Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void refresh()}>刷新</Button>
          </Space>
        )}
      >
        <Table className="admin-selection-table"
          rowKey="projectId"
          tableLayout="fixed"
          pagination={false}
          loading={loading}
          dataSource={rows}
          rowSelection={{ columnWidth: 72, selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={[
            { title: '项目 ID', dataIndex: 'projectId', width: 120, align: 'center' as const },
            { title: 'App Key', dataIndex: 'appKey', align: 'center' as const, ellipsis: true },
            { title: '项目名称', dataIndex: 'name', align: 'center' as const, ellipsis: true },
            { title: '创建时间', dataIndex: 'createdAt', width: 240, align: 'center' as const, render: (value: number | null) => value == null ? '—' : dayjs(value).format('YYYY-MM-DD HH:mm:ss') },
            { title: '操作', width: 150, align: 'center' as const, render: (_, project) => <Space size={2}><Button type="link" onClick={() => openEdit(project)}>编辑</Button><Button type="link" danger onClick={() => confirmClose(project)}>关闭</Button></Space> },
          ]}
        />
        <div className="admin-pagination"><Pagination current={1} pageSize={rows.length || 1} total={rows.length} showSizeChanger={false} showTotal={(total) => `共 ${total} 条`} /></div>
      </Card>
      <Modal title="编辑项目" open={editing !== null} okText="保存" cancelText="取消" confirmLoading={saving} onOk={() => form.submit()} onCancel={() => { if (!saving) setEditing(null) }}>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={save}>
          <Form.Item label="App Key" name="appKey" rules={[{ required: true, whitespace: true, message: '请输入 App Key' }, { max: 64, message: 'App Key 最长 64 位' }]}>
            <Input maxLength={64} placeholder="请输入 App Key" />
          </Form.Item>
          <Form.Item label="项目名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入项目名称' }, { max: 64, message: '项目名称最长 64 位' }]}>
            <Input maxLength={64} placeholder="请输入项目名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
