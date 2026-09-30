import { App, Button, Checkbox, Empty, Form, Input, Select, Space, Table, Tag, Tooltip, Tree } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { DeleteOutlined, DownOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons'
import { useState } from 'react'
import dayjs from 'dayjs'

export type ValueType = 'string' | 'number' | 'boolean' | 'time' | 'json' | 'jsonText'
export type JsonMapping = { path: string; label: string; type: ValueType }
export type FieldMapping = {
  source: string
  sourceType: string
  key: string
  type: ValueType
  label: string
  json?: { sample?: string; showRaw: boolean; showMapped: boolean; mappings: JsonMapping[] }
}

const sourceTypes = ['txt', 'varchar', 'int', 'bigint', 'decimal', 'boolean', 'datetime'].map((value) => ({ value, label: value }))
const valueTypes = [{ value: 'string', label: '文本' }, { value: 'number', label: '数字' }, { value: 'boolean', label: '布尔值' }, { value: 'time', label: '日期时间' }, { value: 'json', label: 'JSON 对象' }, { value: 'jsonText', label: 'JSON 文本' }]

type SampleNode = { path: string; label: string; value: unknown; type: ValueType }
type SampleTree = { nodes: DataNode[]; values: Map<string, SampleNode> }

function inspectSample(value: unknown): SampleTree {
  const values = new Map<string, SampleNode>()
  function visit(raw: unknown, path: string, label: string, depth: number): DataNode {
    let value = raw
    let jsonText = false
    if (typeof value === 'string') {
      try {
        const decoded: unknown = JSON.parse(value)
        if (decoded !== null && typeof decoded === 'object') { value = decoded; jsonText = true }
      } catch { /* Ordinary text remains a leaf in the sample tree. */ }
    }
    const type: ValueType = jsonText ? 'jsonText' : value !== null && typeof value === 'object' ? 'json' : typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string'
    values.set(path, { path, label, value, type })
    const children = depth < 16 && value !== null && typeof value === 'object' ? Object.entries(value).map(([key, child]) => {
      const childPath = Array.isArray(value) ? `${path}[${key}]` : /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`
      return visit(child, childPath, key, depth + 1)
    }) : undefined
    return { key: path, title: <Space size={8}><span>{label}</span><Tag>{valueTypes.find((item) => item.value === type)?.label}</Tag></Space>, children }
  }
  return { nodes: [visit(value, '$', '$', 0)], values }
}

function displaySample(value: unknown, type: ValueType) {
  if (value == null) return '-'
  if (type === 'boolean') return value === true ? '是' : value === false ? '否' : String(value)
  if (type === 'time' && (typeof value === 'string' || typeof value === 'number')) {
    const time = dayjs(value)
    return time.isValid() ? time.format('YYYY-MM-DD HH:mm:ss') : String(value)
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function JsonConfiguration({ index }: { index: number }) {
  const { message } = App.useApp()
  const form = Form.useFormInstance()
  const base = ['fields', index, 'json']
  const mappings: JsonMapping[] = Form.useWatch([...base, 'mappings'], form) ?? []
  const showMapped = Form.useWatch([...base, 'showMapped'], form)
  const [sampleTree, setSampleTree] = useState<SampleTree | null>(() => {
    const sample = form.getFieldValue([...base, 'sample'])
    try { return sample ? inspectSample(JSON.parse(sample)) : null } catch { return null }
  })

  function parse() {
    try {
      const parsed: unknown = JSON.parse(form.getFieldValue([...base, 'sample']) ?? '')
      if (parsed === null || typeof parsed !== 'object') throw new Error()
      setSampleTree(inspectSample(parsed))
    } catch {
      setSampleTree(null)
      message.error('请输入有效的 JSON 对象或数组')
    }
  }

  return <div className="dc-json-config">
    <div className="dc-json-options">
      <Form.Item name={[index, 'json', 'showRaw']} valuePropName="checked"><Checkbox>展示原始 JSON</Checkbox></Form.Item>
      <Form.Item name={[index, 'json', 'showMapped']} valuePropName="checked"><Checkbox>展示映射字段</Checkbox></Form.Item>
    </div>
    <div className="dc-json-sample">
      <Form.Item label="JSON 示例" name={[index, 'json', 'sample']}><Input.TextArea rows={3} placeholder="粘贴 JSON 对象或数组" onChange={() => setSampleTree(null)} /></Form.Item>
      <Button onClick={parse}>解析示例</Button>
    </div>
    {sampleTree && <div className="dc-json-tree">
      <Tree key={form.getFieldValue([...base, 'sample'])} checkable checkStrictly defaultExpandAll treeData={sampleTree.nodes} checkedKeys={mappings.map((item) => item.path)} onCheck={(keys) => {
        const checked = Array.isArray(keys) ? keys : keys.checked
        const next = mappings.filter((item) => !sampleTree.values.has(item.path) || checked.includes(item.path))
        for (const key of checked) {
          const node = sampleTree.values.get(String(key))
          if (node && !next.some((item) => item.path === key)) next.push({ path: node.path, label: node.label, type: node.type })
        }
        form.setFieldValue([...base, 'mappings'], next)
      }} />
    </div>}
    <Form.List name={[index, 'json', 'mappings']}>
      {(items, { add, remove }) => <>
        <div className="dc-field-heading"><span>JSON 路径</span><span>展示名称</span><span>展示类型</span><span /></div>
        {items.map((item) => <div className="dc-field-row" key={item.key}>
          <Form.Item name={[item.name, 'path']} rules={[{ required: true, whitespace: true, message: '请输入 JSON 路径' }]}><Input aria-label="JSON 路径" placeholder="$.profile.nickname" /></Form.Item>
          <Form.Item name={[item.name, 'label']} rules={[{ required: true, whitespace: true, message: '请输入展示名称' }]}><Input aria-label="映射展示名称" placeholder="展示名称" /></Form.Item>
          <Form.Item name={[item.name, 'type']} rules={[{ required: true }]}><Select aria-label="映射展示类型" options={valueTypes} /></Form.Item>
          <Tooltip title="移除映射"><Button aria-label="移除映射" icon={<DeleteOutlined />} onClick={() => remove(item.name)} /></Tooltip>
        </div>)}
        {!items.length && <div className="dc-mapping-empty">暂无子字段映射</div>}
        <Button icon={<PlusOutlined />} onClick={() => add({ path: '', label: '', type: 'string' })}>添加子字段映射</Button>
      </>}
    </Form.List>
    {sampleTree && showMapped && mappings.length > 0 && <div className="dc-json-preview">
      <h4>映射预览</h4>
      <Table<JsonMapping> size="small" rowKey="path" pagination={false} dataSource={mappings} columns={[
        { title: '展示名称', dataIndex: 'label', width: 160, ellipsis: true },
        { title: '示例值', render: (_, item) => { const node = sampleTree.values.get(item.path); return node ? displaySample(node.value, item.type) : '-' } },
      ]} />
    </div>}
  </div>
}

function MappingRow({ index, remove }: { index: number; remove: () => void }) {
  const form = Form.useFormInstance()
  const type: ValueType | undefined = Form.useWatch(['fields', index, 'type'], form)
  const [expanded, setExpanded] = useState(false)
  const json = type === 'jsonText' || type === 'json'
  return <div className="dc-mapping-group">
    <div className="dc-mapping-row">
      <Form.Item name={[index, 'source']} label="源字段" rules={[{ required: true, whitespace: true, message: '请输入源字段' }]}><Input placeholder="源字段" /></Form.Item>
      <Form.Item name={[index, 'sourceType']} label="源字段类型" rules={[{ required: true }]}><Select options={sourceTypes} /></Form.Item>
      <Form.Item name={[index, 'key']} label="返回字段" rules={[{ required: true, whitespace: true, message: '请输入返回字段' }]}><Input placeholder="返回字段" /></Form.Item>
      <Form.Item name={[index, 'type']} label="返回类型" rules={[{ required: true }]}><Select options={valueTypes} /></Form.Item>
      <Form.Item name={[index, 'label']} label="字段描述" rules={[{ required: true, whitespace: true, message: '请输入字段描述' }]}><Input placeholder="字段描述" /></Form.Item>
      <Tooltip title="移除字段"><Button className="dc-remove-field" aria-label="移除字段" icon={<DeleteOutlined />} onClick={remove} /></Tooltip>
    </div>
    {json && <div className="dc-mapping-actions">
      <Button size="small" icon={expanded ? <UpOutlined /> : <DownOutlined />} onClick={() => {
        if (!form.getFieldValue(['fields', index, 'json'])) form.setFieldValue(['fields', index, 'json'], { showRaw: false, showMapped: true, mappings: [] })
        setExpanded(!expanded)
      }}>{expanded ? '收起映射' : '配置映射'}</Button>
    </div>}
    {json && <div hidden={!expanded}><JsonConfiguration index={index} /></div>}
  </div>
}

export function FieldMappingEditor() {
  return <Form.List name="fields">
    {(fields, { add, remove }) => <>
      {fields.map((field) => <MappingRow key={field.key} index={field.name} remove={() => remove(field.name)} />)}
      {!fields.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无字段映射" />}
      <Button icon={<PlusOutlined />} onClick={() => add({ source: '', sourceType: 'txt', key: '', type: 'string', label: '' })}>添加字段</Button>
    </>}
  </Form.List>
}
