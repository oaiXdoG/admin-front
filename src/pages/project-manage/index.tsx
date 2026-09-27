import { Button, Card, Input, Pagination, Space, Table } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import type { Key } from 'react'
import { useOutletContext } from 'react-router'
import type { LayoutOutletContext } from '@/layouts/context.ts'

export function ProjectManagePage() {
  const { projects, mustCreate, onOpenCreate } = useOutletContext<LayoutOutletContext>()
  const [keyword, setKeyword] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const rows = useMemo(() => (projects?.projects ?? []).filter((item) => keyword ? item.name.includes(keyword.trim()) : true), [keyword, projects])

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
            <Button icon={<ReloadOutlined />}>刷新</Button>
          </Space>
        )}
      >
        <Table className="admin-selection-table"
          rowKey="projectId"
          tableLayout="fixed"
          pagination={false}
          dataSource={rows}
          rowSelection={{ columnWidth: 72, selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={[
            { title: '序号', className: 'admin-index-column', width: 96, align: 'center' as const, render: (_, __, index) => index + 1 },
            { title: '项目 ID', dataIndex: 'projectId', width: 120, align: 'center' as const },
            { title: '项目名称', dataIndex: 'name', ellipsis: true },
            { title: '当前角色', dataIndex: 'roleName', width: '28%', ellipsis: true },
            { title: '当前项目', width: 110, align: 'center' as const, render: (_, row) => (row.projectId === projects?.currentProjectId ? '当前' : '') },
            { title: '操作', width: 150, align: 'center' as const, render: () => <Button type="link" disabled>编辑</Button> },
          ]}
        />
        <div className="admin-pagination"><Pagination current={1} pageSize={rows.length || 1} total={rows.length} showSizeChanger={false} showTotal={(total) => `共 ${total} 条`} /></div>
      </Card>
    </div>
  )
}
