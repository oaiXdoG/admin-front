import { App, Button, DatePicker, Empty, Form, Input, InputNumber, Layout, Menu, Modal, Radio, Select, Space, Table, Tag, Tooltip } from 'antd'
import { AppstoreOutlined, CloseOutlined, DatabaseOutlined, FileSearchOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PlusOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons'
import { useState } from 'react'
import '@/styles/global.css'
import '@/layouts/basic-layout.css'
import './data-center.css'
import { FieldMappingEditor } from './field-mapping.tsx'
import type { FieldMapping } from './field-mapping.tsx'

export type Category = 'data' | 'log'
type TemplateValues = { name: string; category: Category; url: string; fields: FieldMapping[] }
export type Template = TemplateValues & { id: number; projectId: number }
type Condition = { id: number; field?: string; operator: string }

const categories = [{ value: 'data', label: '数据查询' }, { value: 'log', label: '日志查询' }]
const compare = [{ value: 'eq', label: '等于' }, { value: 'ne', label: '不等于' }, { value: 'gt', label: '大于' }, { value: 'ge', label: '大于等于' }, { value: 'lt', label: '小于' }, { value: 'le', label: '小于等于' }, { value: 'between', label: '介于' }]

export function TemplateManager({ projectId, templates, onSave, onRemove }: { projectId: number; templates: Template[]; onSave: (template: Template) => void; onRemove: (id: number) => void }) {
  const { modal } = App.useApp()
  const [form] = Form.useForm<TemplateValues>()
  const [editor, setEditor] = useState<Template | 'new' | null>(null)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<Category>()
  const rows = templates.filter((item) => item.name.includes(keyword.trim()) && (!category || item.category === category))

  function open(template: Template | 'new') {
    form.resetFields()
    form.setFieldsValue(template === 'new' ? { name: '', category: 'data', url: '', fields: [] } : template)
    setEditor(template)
  }

  function save(values: TemplateValues) {
    if (!editor) return
    onSave({ ...values, name: values.name.trim(), url: values.url.trim(), fields: values.fields ?? [], projectId, id: editor === 'new' ? Date.now() : editor.id })
    setEditor(null)
  }

  return <div className="admin-page">
    <section className="dc-section">
      <h2>搜索</h2>
      <div className="dc-filter">
        <label>模板名称<Input allowClear placeholder="请输入模板名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} /></label>
        <label>分类<Select allowClear placeholder="全部分类" options={categories} value={category} onChange={setCategory} /></label>
        <Button onClick={() => { setKeyword(''); setCategory(undefined) }}>重置</Button>
      </div>
    </section>
    <section className="dc-section">
      <div className="dc-section-title"><h2>查询模板</h2><Button type="primary" icon={<PlusOutlined />} onClick={() => open('new')}>新增模板</Button></div>
      <Table<Template> rowKey="id" tableLayout="fixed" dataSource={rows} scroll={{ x: 760 }} pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无查询模板" /> }} columns={[
        { title: '模板名称', dataIndex: 'name', width: 200, ellipsis: true },
        { title: '分类', dataIndex: 'category', width: 120, render: (value: Category) => <Tag color={value === 'data' ? 'blue' : 'green'}>{value === 'data' ? '数据查询' : '日志查询'}</Tag> },
        { title: '查询接口地址', dataIndex: 'url', ellipsis: true },
        { title: '操作', width: 140, render: (_, row) => <Space size={0}><Button type="link" onClick={() => open(row)}>编辑</Button><Button type="link" danger onClick={() => modal.confirm({ title: '删除模板', content: `删除「${row.name}」？`, okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => onRemove(row.id) })}>删除</Button></Space> },
      ]} />
    </section>
    <Modal className="dc-editor" title={editor === 'new' ? '新增查询模板' : '编辑查询模板'} width={1100} open={editor !== null} okText="保存" cancelText="取消" onOk={() => form.submit()} onCancel={() => setEditor(null)}>
      <Form className="dc-editor-form" form={form} layout="vertical" requiredMark={false} onFinish={save}>
        <section className="dc-editor-section">
          <h3>基本信息</h3>
            <div className="dc-basic-grid">
              <Form.Item label="模板名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入模板名称' }]}><Input placeholder="请输入模板名称" /></Form.Item>
              <Form.Item label="分类" name="category" rules={[{ required: true }]}><Select options={categories} /></Form.Item>
            </div>
            <Form.Item label="完整查询接口地址" name="url" rules={[{ required: true, whitespace: true, message: '请输入完整接口地址' }, { validator: (_, value: string) => {
              if (!value?.trim()) return Promise.resolve()
              try { const url = new URL(value.trim()); if (url.protocol === 'https:' || url.protocol === 'http:') return Promise.resolve() } catch { /* Validate the complete URL before retaining the draft. */ }
              return Promise.reject(new Error('请输入完整的 HTTP 或 HTTPS 地址'))
            } }]}><Input placeholder="https://" /></Form.Item>
        </section>
        <section className="dc-editor-section">
          <h3>字段映射</h3>
          <FieldMappingEditor />
        </section>
      </Form>
    </Modal>
  </div>
}

export function QueryWorkspace({ category, templates }: { category: Category; templates: Template[] }) {
  const [templateId, setTemplateId] = useState<number>()
  const [conditions, setConditions] = useState<Condition[]>([])
  const [relation, setRelation] = useState('and')
  const [form] = Form.useForm()
  const available = templates.filter((template) => template.category === category)
  const template = available.find((item) => item.id === templateId)
  const queryFields = template?.fields ?? []
  const columns = template?.fields.flatMap((field) => {
    if (field.type !== 'json' && field.type !== 'jsonText') return [{ key: field.key, title: field.label, dataIndex: field.key, ellipsis: true }]
    const raw = !field.json || field.json.showRaw ? [{ key: field.key, title: field.label, dataIndex: field.key, ellipsis: true }] : []
    const mapped = field.json?.showMapped ? (field.json.mappings ?? []).map((mapping) => ({ key: `${field.key}:${mapping.path}`, title: mapping.label, dataIndex: `${field.key}:${mapping.path}`, ellipsis: true })) : []
    return [...raw, ...mapped]
  }) ?? []
  const title = category === 'data' ? '数据查询' : '日志查询'

  function reset() {
    setConditions([])
    setRelation('and')
    form.resetFields()
  }

  return <div className="admin-page">
    <section className="dc-section">
      <div className="dc-section-title"><h2>{title}</h2></div>
      <div className="dc-module"><label htmlFor="dc-module">查询模块</label><Select id="dc-module" allowClear placeholder="请选择查询模块" value={template?.id} options={available.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => { setTemplateId(value); reset() }} /></div>
    </section>
    <section className="dc-section">
      <div className="dc-section-title"><h2>查询条件</h2><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'AND', value: 'and' }, { label: 'OR', value: 'or' }]} value={relation} onChange={(event) => setRelation(event.target.value)} disabled={conditions.length < 2} /></div>
      <Form form={form}>
        {conditions.map((condition) => {
          const field = queryFields.find((item) => item.key === condition.field)
          const operators = field?.type === 'number' || field?.type === 'time' ? compare : [{ value: 'eq', label: '等于' }, { value: 'ne', label: '不等于' }, { value: 'contains', label: '包含' }]
          return <div className="dc-condition" key={condition.id}>
            <Select className="dc-condition-field" aria-label="查询字段" placeholder="选择字段" value={condition.field} options={queryFields.map((item) => ({ value: item.key, label: item.label }))} onChange={(value) => {
              setConditions((items) => items.map((item) => item.id === condition.id ? { ...item, field: value, operator: 'eq' } : item))
              form.resetFields([[condition.id]])
            }} />
            <Select className="dc-condition-operator" aria-label="操作符" value={condition.operator} options={operators} disabled={!field} onChange={(value) => {
              setConditions((items) => items.map((item) => item.id === condition.id ? { ...item, operator: value } : item))
              form.resetFields([[condition.id]])
            }} />
            <Form.Item name={field?.type === 'number' && condition.operator === 'between' ? undefined : [condition.id, 'value']}>
              {field?.type === 'time' ? condition.operator === 'between' ? <DatePicker.RangePicker showTime /> : <DatePicker showTime placeholder="选择时间" /> : field?.type === 'number' ? condition.operator === 'between' ? <Space.Compact><Form.Item name={[condition.id, 'min']} noStyle><InputNumber placeholder="最小值" /></Form.Item><Form.Item name={[condition.id, 'max']} noStyle><InputNumber placeholder="最大值" /></Form.Item></Space.Compact> : <InputNumber placeholder="输入数值" /> : <Input placeholder="输入条件值" disabled={!field} />}
            </Form.Item>
            <Tooltip title="移除条件"><Button aria-label="移除条件" icon={<CloseOutlined />} onClick={() => { setConditions((items) => items.filter((item) => item.id !== condition.id)); form.resetFields([[condition.id]]) }} /></Tooltip>
          </div>
        })}
      </Form>
      {!conditions.length && <div className="dc-condition-empty">暂无筛选条件</div>}
      <div className="dc-query-actions"><Button icon={<PlusOutlined />} disabled={!queryFields.length} onClick={() => setConditions((items) => [...items, { id: Date.now(), operator: 'eq' }])}>添加条件</Button><Space><Button onClick={reset}>重置</Button><Button type="primary" icon={<SearchOutlined />} disabled>查询</Button></Space></div>
    </section>
    <section className="dc-section">
      <div className="dc-section-title"><h2>查询结果</h2><span className="dc-count">共 0 条</span></div>
      <Table rowKey="id" tableLayout="fixed" scroll={{ x: columns.length ? Math.max(600, columns.length * 160) : undefined }} dataSource={[]} columns={columns} pagination={false} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无查询结果" /> }} />
    </section>
  </div>
}

export function DataCenterPreview() {
  const [page, setPage] = useState('data')
  const [projectId, setProjectId] = useState(1)
  const [collapsed, setCollapsed] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const titles: Record<string, string> = { data: '数据查询', log: '日志查询', templates: '查询模板管理' }
  const current = templates.filter((item) => item.projectId === projectId)
  return <Layout className="dc-shell">
    <Layout.Sider theme="light" width={216} collapsed={collapsed} collapsedWidth={0} className="dc-sidebar">
      <div className="dc-brand"><DatabaseOutlined /><span>数据中心</span></div>
      <Menu mode="inline" selectedKeys={[page]} defaultOpenKeys={['center']} onClick={({ key }) => setPage(key)} items={[{ key: 'center', label: '数据中心', icon: <AppstoreOutlined />, children: [{ key: 'data', label: '数据查询', icon: <SearchOutlined /> }, { key: 'log', label: '日志查询', icon: <FileSearchOutlined /> }, { key: 'templates', label: '查询模板管理', icon: <SettingOutlined /> }] }]} />
    </Layout.Sider>
    <Layout>
      <Layout.Header className="dc-header"><Space><Tooltip title={collapsed ? '展开菜单' : '收起菜单'}><Button type="text" aria-label={collapsed ? '展开菜单' : '收起菜单'} icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} /></Tooltip><span className="dc-breadcrumb">数据中心 / <strong>{titles[page]}</strong></span><Select className="dc-mobile-nav" aria-label="页面" value={page} options={Object.entries(titles).map(([value, label]) => ({ value, label }))} onChange={setPage} /></Space><Select aria-label="当前项目" value={projectId} options={[{ value: 1, label: '项目 1' }, { value: 2, label: '项目 2' }]} onChange={setProjectId} /></Layout.Header>
      <Layout.Content className="dc-content">
        {page === 'templates' ? <TemplateManager key={projectId} projectId={projectId} templates={current} onSave={(template) => setTemplates((items) => [...items.filter((item) => item.id !== template.id), template])} onRemove={(id) => setTemplates((items) => items.filter((item) => item.id !== id))} /> : <QueryWorkspace key={`${projectId}-${page}`} category={page as Category} templates={current} />}
      </Layout.Content>
    </Layout>
  </Layout>
}
