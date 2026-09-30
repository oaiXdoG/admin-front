import { App, Button, Drawer, Empty, Form, Input, InputNumber, Modal, Radio, Space, Table, Tag } from 'antd'
import { FileTextOutlined, PauseCircleOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SettingOutlined, UploadOutlined } from '@ant-design/icons'
import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import dayjs from 'dayjs'
import { OperationsWorkspace, PerformanceWorkspace, serverSample } from './workspace.tsx'
import type { OperationRecord, ServerSample } from './workspace.tsx'

export type ManagedProcess = {
  id: number
  name: string
  host: string
  port: number
  username: string
  authentication: 'password' | 'key'
  directory: string
  scripts: { update?: string; restart?: string; close?: string }
  sample?: ServerSample
  history?: OperationRecord[]
}
type ProcessValues = Omit<ManagedProcess, 'id' | 'sample' | 'history'> & { password?: string; privateKey?: string }

export const sampleProcesses: ManagedProcess[] = [
  { id: 1, name: '进程 A', host: '192.0.2.10', port: 22, username: 'deploy', authentication: 'key', directory: '/srv/process-a', scripts: { update: 'update.sh', restart: 'restart.sh', close: 'stop.sh' }, sample: { ...serverSample, name: '进程 A', memory: 480, memoryTrend: [420, 430, 435, 440, 445, 450, 455, 452, 460, 470, 478, 480] } },
  { id: 2, name: '进程 B', host: '192.0.2.10', port: 22, username: 'deploy', authentication: 'key', directory: '/srv/process-b', scripts: { update: 'update.sh', restart: 'restart.sh', close: 'stop.sh' }, sample: { ...serverSample, name: '进程 B', cpu: 12.8, cpuTrend: [8, 10, 9, 14, 11, 12, 18, 15, 11, 10, 14, 12.8], memory: 256, memoryTrend: [220, 222, 224, 230, 236, 240, 245, 246, 248, 250, 252, 256] } },
  { id: 3, name: '进程 C', host: '192.0.2.20', port: 22, username: 'deploy', authentication: 'password', directory: '/srv/process-c', scripts: { restart: 'restart.sh', close: 'stop.sh' }, sample: { ...serverSample, name: '进程 C', cpu: 7.2, memory: 128, disk: 28.6, cpuTrend: [3, 5, 4, 7, 6, 5, 9, 8, 6, 5, 8, 7.2], memoryTrend: [110, 112, 113, 116, 118, 120, 121, 122, 123, 125, 127, 128] } },
]

export function ProcessWorkspace({ mode, project, processes, onChange }: { mode: 'monitor' | 'operations'; project: string; processes: ManagedProcess[]; onChange: Dispatch<SetStateAction<ManagedProcess[]>> }) {
  const { message, modal } = App.useApp()
  const [keyword, setKeyword] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(processes[0]?.id ?? null)
  const [panel, setPanel] = useState<'update' | 'history' | null>(null)
  const [editor, setEditor] = useState<ManagedProcess | 'new' | null>(null)
  const [form] = Form.useForm<ProcessValues>()
  const authentication = Form.useWatch('authentication', form)
  const selected = processes.find((item) => item.id === selectedId)
  const rows = processes.filter((item) => `${item.name} ${item.host} ${item.directory}`.toLowerCase().includes(keyword.trim().toLowerCase()))

  function configure(process: ManagedProcess | 'new') {
    form.resetFields()
    form.setFieldsValue(process === 'new' ? { name: '', host: '', port: 22, username: '', authentication: 'key', directory: '', scripts: {} } : { ...process, password: '', privateKey: '' })
    setEditor(process)
  }

  function save(values: ProcessValues) {
    if (!editor) return
    const { password: _password, privateKey: _privateKey, ...configuration } = values
    const id = editor === 'new' ? Date.now() : editor.id
    const process: ManagedProcess = { ...(editor === 'new' ? {} : editor), ...configuration, id, name: values.name.trim(), host: values.host.trim(), directory: values.directory.trim() }
    onChange((items) => editor === 'new' ? [...items, process] : items.map((item) => item.id === id ? process : item))
    setEditor(null)
    setSelectedId(id)
    message.success('进程配置已更新')
  }

  function openPanel(process: ManagedProcess, view: 'update' | 'history') {
    setSelectedId(process.id)
    setPanel(view)
  }

  function confirmAction(process: ManagedProcess, action: '重启' | '关闭') {
    if (!process.sample) return
    modal.confirm({
      title: `${action}进程`,
      content: <div className="server-confirm"><p>项目：{project}</p><p>进程：{process.name}</p><p>主机：{process.host}</p><p>运行目录：{process.directory}</p><p>脚本：{action === '重启' ? process.scripts.restart : process.scripts.close}</p></div>,
      okText: `确认${action}`,
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => onChange((items) => items.map((item) => item.id === process.id && item.sample ? {
        ...item,
        sample: { ...item.sample, running: action === '重启' },
        history: [{ id: Date.now(), time: dayjs().format('YYYY-MM-DD HH:mm:ss'), action, target: item.name, host: item.host, artifact: item.sample.version, result: '演示完成' }, ...(item.history ?? [])],
      } : item)),
    })
  }

  const sample = selected?.sample ? { ...selected.sample, name: selected.name, host: selected.host, directory: selected.directory, scripts: selected.scripts } : undefined
  return <div className={`admin-page${mode === 'monitor' ? ' server-monitor-layout' : ''}`}>
    {mode === 'monitor' && <div className="server-monitor-dashboard">
      {selected ? <PerformanceWorkspace key={selected.id} project={project} sample={sample} target={selected} compact /> : <section className="server-section"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择进程" /></section>}
    </div>}
    <section className={`server-section${mode === 'monitor' ? ' server-process-list' : ''}`}>
      <div className="server-toolbar"><h3>进程列表</h3><Space wrap><Input allowClear prefix={<SearchOutlined />} placeholder="进程名称 / 主机 IP / 目录" value={keyword} onChange={(event) => setKeyword(event.target.value)} className="server-process-search" />{mode === 'operations' && <Button type="primary" icon={<PlusOutlined />} onClick={() => configure('new')}>新增进程</Button>}</Space></div>
      <Table<ManagedProcess> rowKey="id" tableLayout="fixed" dataSource={rows} scroll={{ x: mode === 'operations' ? 1260 : 1000, y: mode === 'monitor' ? '100%' : undefined }} rowClassName={(item) => item.id === selectedId ? 'server-selected-process' : ''} pagination={mode === 'monitor' ? false : { pageSize: 8, hideOnSinglePage: true }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无进程" /> }} columns={[
        { title: '进程名称', dataIndex: 'name', width: mode === 'operations' ? 200 : 150, ellipsis: true },
        { title: '主机 IP', dataIndex: 'host', width: mode === 'operations' ? 170 : 140 },
        { title: '状态', width: mode === 'operations' ? 110 : 100, render: (_, item) => <Tag color={item.sample ? item.sample.running === false ? 'warning' : 'success' : 'default'}>{item.sample ? item.sample.running === false ? '已关闭' : '运行中' : '未连接'}</Tag> },
        ...(mode === 'monitor' ? [{ title: '进程 CPU', width: 100, render: (_: unknown, item: ManagedProcess) => item.sample ? `${item.sample.cpu}%` : '—' }, { title: '进程内存', width: 110, render: (_: unknown, item: ManagedProcess) => item.sample ? `${item.sample.memory} MB` : '—' }] : []),
        { title: '运行目录', dataIndex: 'directory', width: mode === 'operations' ? 260 : undefined, ellipsis: true },
        { title: '操作', width: mode === 'operations' ? 520 : 110, render: (_, item) => mode === 'monitor' ? <Button type="link" onClick={() => setSelectedId(item.id)}>查看监控</Button> : <Space size={8}>
          <Button type="link" size="small" icon={<UploadOutlined />} disabled={!item.scripts.update} onClick={() => openPanel(item, 'update')}>更新 JAR</Button>
          <Button type="link" size="small" icon={<ReloadOutlined />} disabled={!item.sample || !item.scripts.restart} onClick={() => confirmAction(item, '重启')}>重启</Button>
          <Button type="link" size="small" danger icon={<PauseCircleOutlined />} disabled={!item.sample || !item.scripts.close || item.sample.running === false} onClick={() => confirmAction(item, '关闭')}>关闭</Button>
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => openPanel(item, 'history')}>操作日志</Button>
          <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => configure(item)}>配置</Button>
        </Space> },
      ]} />
    </section>
    <Drawer rootClassName="server-operations-drawer" title={`${panel === 'update' ? '更新 JAR' : '操作日志'}${selected ? ` · ${selected.name} · ${selected.host}` : ''}`} placement="right" size="min(800px, 100vw)" open={mode === 'operations' && panel !== null && !!selected} onClose={() => setPanel(null)} destroyOnHidden>
      {selected && panel && <OperationsWorkspace key={`${selected.id}-${panel}`} view={panel} project={project} sample={sample} target={selected} history={selected.history ?? []} onRecord={(entry) => onChange((items) => items.map((item) => item.id === selected.id ? { ...item, history: [entry, ...(item.history ?? [])] } : item))} onStatusChange={(running, version) => onChange((items) => items.map((item) => item.id === selected.id && item.sample ? { ...item, sample: { ...item.sample, running, version } } : item))} />}
    </Drawer>
    <Modal title={editor === 'new' ? '新增进程' : '编辑进程配置'} open={editor !== null} width={800} okText="保存" cancelText="取消" onOk={() => form.submit()} onCancel={() => setEditor(null)}>
      <Form className="server-process-form" form={form} layout="vertical" requiredMark={false} onFinish={save}>
        <Form.Item label="进程名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入进程名称' }]}><Input placeholder="请输入进程名称" /></Form.Item>
        <div className="server-config-grid">
          <Form.Item label="主机 IP" name="host" rules={[{ required: true, whitespace: true, message: '请输入主机 IP' }]}><Input placeholder="请输入目标主机 IP" /></Form.Item>
          <Form.Item label="SSH 端口" name="port" rules={[{ required: true, message: '请输入 SSH 端口' }]}><InputNumber min={1} max={65535} precision={0} style={{ width: '100%' }} /></Form.Item>
        </div>
        <Form.Item label="登录用户" name="username" rules={[{ required: true, whitespace: true, message: '请输入登录用户' }]}><Input autoComplete="off" /></Form.Item>
        <Form.Item label="认证方式" name="authentication"><Radio.Group options={[{ label: '密码', value: 'password' }, { label: '密钥', value: 'key' }]} /></Form.Item>
        {authentication === 'password' ? <Form.Item label="登录密码" name="password" preserve={false}><Input.Password autoComplete="new-password" placeholder={editor === 'new' ? '请输入密码' : '填写新密码'} /></Form.Item> : <Form.Item label="私钥" name="privateKey" preserve={false}><Input.TextArea rows={3} placeholder={editor === 'new' ? '粘贴私钥' : '填写新私钥'} autoComplete="off" /></Form.Item>}
        <Form.Item label="运行目录" name="directory" rules={[{ required: true, whitespace: true, message: '请输入运行目录' }]}><Input placeholder="进程运行目录" /></Form.Item>
        <div className="server-script-fields"><h4>操作脚本</h4><Form.Item label="更新脚本" name={['scripts', 'update']}><Input placeholder="脚本文件路径" /></Form.Item><Form.Item label="重启脚本" name={['scripts', 'restart']}><Input placeholder="脚本文件路径" /></Form.Item><Form.Item label="关闭脚本" name={['scripts', 'close']}><Input placeholder="脚本文件路径" /></Form.Item></div>
      </Form>
    </Modal>
  </div>
}
