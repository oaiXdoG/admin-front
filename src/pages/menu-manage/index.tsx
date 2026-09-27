import { App, Button, Card, Form, Input, InputNumber, Modal, Radio, Select, Space, Switch, Table, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import type { Key } from 'react'
import { appRoutes } from '@/router/routes.ts'
import { createMenu, fetchMenuList, removeMenu, updateMenu } from '@/services/menu.ts'
import type { MenuRecord, MenuWrite } from '@/types/api.ts'

type MenuNode = MenuRecord & {
  children?: MenuNode[]
}

type FormValues = {
  menuType: number
  name: string
  icon?: string
  routeName?: string
  routePath?: string
  status: number
  hidden: boolean
  sort?: number
}

type Editor =
  | { mode: 'create'; parent: MenuRecord | null }
  | { mode: 'edit'; record: MenuRecord }

function buildTree(list: MenuRecord[]) {
  const nodes = new Map<number, MenuNode>()
  for (const item of list) {
    nodes.set(item.id, { ...item })
  }
  const roots: MenuNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId === 0 ? undefined : nodes.get(node.parentId)
    if (!parent) {
      roots.push(node)
      continue
    }
    parent.children = parent.children ?? []
    parent.children.push(node)
  }
  const sortNodes = (items: MenuNode[]) => {
    items.sort((left, right) => left.sort - right.sort || left.id - right.id)
    for (const item of items) {
      if (item.children?.length) {
        sortNodes(item.children)
      }
    }
  }
  sortNodes(roots)
  return roots
}

function toWrite(values: FormValues, parentId?: number): MenuWrite {
  return {
    parentId,
    menuType: values.menuType,
    name: values.name.trim(),
    icon: values.icon?.trim() ?? '',
    routeName: values.routeName?.trim() ?? '',
    routePath: values.routePath?.trim() ?? '',
    status: values.status,
    hidden: values.hidden,
    sort: values.sort ?? 0,
  }
}

export function MenuManagePage() {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<MenuRecord[]>([])
  const [editor, setEditor] = useState<Editor | null>(null)
  const [keyword, setKeyword] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])

  async function load() {
    setLoading(true)
    try {
      setRows(await fetchMenuList())
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取菜单失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function openCreate(parent: MenuRecord | null) {
    form.setFieldsValue({
      menuType: 2,
      name: '',
      icon: '',
      routeName: '',
      routePath: '',
      status: 1,
      hidden: false,
      sort: 0,
    })
    setEditor({ mode: 'create', parent })
  }

  function openEdit(record: MenuRecord) {
    form.setFieldsValue({
      menuType: record.menuType,
      name: record.name,
      icon: record.icon,
      routeName: record.routeName,
      routePath: record.routePath,
      status: record.status,
      hidden: record.hidden,
      sort: record.sort,
    })
    setEditor({ mode: 'edit', record })
  }

  async function onSubmit(values: FormValues) {
    if (!editor) {
      return
    }
    setSaving(true)
    try {
      if (editor.mode === 'create') {
        const parentId = editor.parent?.id
        await createMenu(toWrite(values, parentId && parentId > 0 ? parentId : undefined))
        message.success('菜单已新增')
      } else {
        await updateMenu(editor.record.id, toWrite(values, editor.record.parentId))
        message.success('菜单已修改')
      }
      setEditor(null)
      await load()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存菜单失败')
    } finally {
      setSaving(false)
    }
  }

  function onRemove(record: MenuRecord) {
    modal.confirm({
      title: '删除菜单',
      content: `删除「${record.name}」？`,
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await removeMenu(record.id)
          message.success('菜单已删除')
          await load()
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除菜单失败')
        }
      },
    })
  }

  return (
    <div className="admin-page">
      <Card className="admin-card admin-filter-card" variant="borderless" title="搜索">
        <Form layout="inline" className="admin-filter-form" onFinish={() => undefined}>
          <Form.Item label="菜单名称"><Input allowClear value={keyword} placeholder="请输入菜单名称、路由名称或路径" onChange={(event) => setKeyword(event.target.value)} /></Form.Item>
          <Form.Item className="admin-filter-actions"><Space><Button onClick={() => setKeyword('')}>重置</Button><Button type="primary" htmlType="submit">搜索</Button></Space></Form.Item>
        </Form>
      </Card>
      <Card
        className="admin-card admin-table-card"
        variant="borderless"
        title="菜单列表"
        extra={<Space><Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(null)}>新增</Button><Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button></Space>}
      >
        <Table<MenuNode>
          key={rows.map((item) => item.id).join(',')}
          className="admin-selection-table admin-menu-table"
          rowKey="id"
          tableLayout="fixed"
          loading={loading}
          pagination={false}
          rowSelection={{ columnWidth: 72, checkStrictly: false, selectedRowKeys, onChange: setSelectedRowKeys }}
          expandable={{ defaultExpandAllRows: true, expandIconColumnIndex: 0, indentSize: 0 }}
          dataSource={buildTree(rows.filter((item) => !keyword || `${item.name} ${item.routeName} ${item.routePath}`.toLowerCase().includes(keyword.toLowerCase())))}
          columns={[
            { title: '序号', className: 'admin-index-column', width: 96, align: 'center' as const, render: (_, record) => record.id },
            { title: '菜单名称', dataIndex: 'name', align: 'center' as const, ellipsis: true },
            {
              title: '类型',
              dataIndex: 'menuType',
              width: 100,
              align: 'center' as const,
              render: (menuType: number) => (menuType === 1 ? '目录' : '菜单'),
            },
            { title: '路由名称', dataIndex: 'routeName', width: 180, align: 'center' as const, ellipsis: true },
            { title: '路由路径', dataIndex: 'routePath', width: 200, align: 'center' as const, ellipsis: true },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              align: 'center' as const,
              render: (status: number) => (status === 1 ? <Tag color="success">启用</Tag> : <Tag color="warning">停用</Tag>),
            },
            {
              title: '隐藏',
              dataIndex: 'hidden',
              width: 90,
              align: 'center' as const,
              render: (hidden: boolean) => (hidden ? '是' : '否'),
            },
            { title: '排序', dataIndex: 'sort', width: 80, align: 'center' as const },
            {
              title: '操作',
              width: 260,
              align: 'center' as const,
              render: (_, record) => (
                <Space size={2}>
                  {record.menuType === 1 ? (
                    <Button type="link" onClick={() => openCreate(record)}>
                      新增子菜单
                    </Button>
                  ) : null}
                  {!record.builtIn ? <Button type="link" onClick={() => openEdit(record)}>编辑</Button> : null}
                  {!record.builtIn ? <Button type="link" onClick={() => onRemove(record)}>删除</Button> : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={
          editor?.mode === 'edit'
            ? '编辑菜单'
            : editor?.parent
              ? `新增子菜单：${editor.parent.name}`
              : '新增菜单'
        }
        open={editor !== null}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        onOk={() => form.submit()}
        onCancel={() => setEditor(null)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false} onFinish={onSubmit}>
          <Form.Item label="已注册路由">
            <Select
              allowClear
              placeholder="选择后填入路由名称和路径"
              options={appRoutes.map((item) => ({
                value: item.name,
                label: `${item.title}  ${item.name}  ${item.path}`,
              }))}
              onChange={(name: string) => {
                const route = appRoutes.find((item) => item.name === name)
                if (!route) {
                  return
                }
                form.setFieldsValue({
                  menuType: route.directory ? 1 : 2,
                  routeName: route.name,
                  routePath: route.path,
                  name: form.getFieldValue('name') || route.title,
                })
              }}
            />
          </Form.Item>
          <Form.Item label="类型" name="menuType" rules={[{ required: true, message: '请选择类型' }]}>
            <Radio.Group>
              <Radio value={1}>目录</Radio>
              <Radio value={2}>菜单</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            label="名称"
            name="name"
            rules={[
              { required: true, whitespace: true, message: '请输入名称' },
              { max: 64, message: '名称最长 64 位' },
            ]}
          >
            <Input maxLength={64} placeholder="请输入名称" />
          </Form.Item>
          <Form.Item label="图标" name="icon" rules={[{ max: 64, message: '图标最长 64 位' }]}>
            <Input maxLength={64} placeholder="可空" />
          </Form.Item>
          <Form.Item label="路由名称" name="routeName" rules={[{ max: 64, message: '路由名称最长 64 位' }]}>
            <Input maxLength={64} placeholder="可空" />
          </Form.Item>
          <Form.Item label="路由路径" name="routePath" rules={[{ max: 128, message: '路由路径最长 128 位' }]}>
            <Input maxLength={128} placeholder="可空" />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
            <Radio.Group>
              <Radio value={1}>启用</Radio>
              <Radio value={2}>停用</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="隐藏" name="hidden" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="排序" name="sort">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
