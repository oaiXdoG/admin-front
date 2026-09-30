import { App, Button, Empty, Radio, Space, Table, Tag, Tooltip, Upload } from 'antd'
import { CloudUploadOutlined, DeleteOutlined, PauseCircleOutlined, ReloadOutlined, SyncOutlined, UploadOutlined } from '@ant-design/icons'
import type { EChartsOption } from 'echarts'
import { useState } from 'react'
import dayjs from 'dayjs'
import { EChart } from '@/components/echart.tsx'
import './server-manage.css'

export type ServerSample = {
  name: string
  host?: string
  directory?: string
  running?: boolean
  scripts?: { update?: string; restart?: string; close?: string }
  version: string
  cpu: number
  memory: number
  disk: number
  uptime: string
  times: string[]
  cpuTrend: number[]
  memoryTrend: number[]
  networkIn: number[]
  networkOut: number[]
}

export const serverSample: ServerSample = {
  name: '示例服务器', version: 'app-1.2.0.jar', cpu: 28.4, memory: 61.2, disk: 43.8, uptime: '3 天 12 小时',
  times: ['18:00', '18:05', '18:10', '18:15', '18:20', '18:25', '18:30', '18:35', '18:40', '18:45', '18:50', '18:55'],
  cpuTrend: [19, 22, 18, 32, 25, 28, 39, 31, 24, 26, 30, 28.4],
  memoryTrend: [54, 55, 55.8, 57, 57.2, 58, 59.1, 58.4, 59, 60.2, 61, 61.2],
  networkIn: [12, 18, 14, 23, 21, 17, 28, 25, 22, 17, 21, 19],
  networkOut: [7, 10, 9, 15, 13, 12, 17, 16, 14, 10, 14, 12],
}

function chartOption(times: string[], series: { name: string; values: number[]; color: string }[], unit: string): EChartsOption {
  return {
    animation: false,
    grid: { left: 44, right: 20, top: 32, bottom: 30 },
    tooltip: { trigger: 'axis' },
    legend: { right: 12, top: 0, icon: 'circle', itemWidth: 8, itemHeight: 8 },
    xAxis: { type: 'category', boundaryGap: false, data: times, axisLine: { lineStyle: { color: '#dfe4ea' } }, axisLabel: { color: '#7b8493' }, axisTick: { show: false } },
    yAxis: { type: 'value', min: 0, max: unit === '%' ? 100 : undefined, axisLabel: { formatter: `{value}${unit}`, color: '#7b8493' }, splitLine: { lineStyle: { color: '#edf0f5' } } },
    series: series.map((item) => ({ name: item.name, type: 'line', data: item.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: item.color }, itemStyle: { color: item.color } })),
  }
}

export type ProcessIdentity = { name: string; host?: string; directory?: string }

function ServerIdentity({ project, sample, target, running = true }: { project: string; sample?: ServerSample; target?: ProcessIdentity; running?: boolean }) {
  const identity = target ?? sample
  return <div className="server-identity">
    <div><h2>{identity?.name ?? (project || '未选择进程')}</h2><span>{identity ? `${project}${identity.host ? ` · ${identity.host}` : ''}` : '暂无进程监控数据'}</span></div>
    <Space><Tag color={sample ? running ? 'success' : 'warning' : 'default'}>{sample ? running ? '运行中' : '已关闭' : '未连接'}</Tag>{sample && <Tag>演示</Tag>}</Space>
  </div>
}

export function PerformanceWorkspace({ project, sample, target, compact = false }: { project: string; sample?: ServerSample; target?: ProcessIdentity; compact?: boolean }) {
  const [range, setRange] = useState(60)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState<string>()
  const sampleSize = range === 15 ? 4 : range === 30 ? 7 : 12
  const times = sample?.times.slice(-sampleSize) ?? []
  const trend = (name: string, values: number[] | undefined, color: string) => ({ name, values: values?.slice(-sampleSize) ?? [], color })
  return <div className={`admin-page server-page${compact ? ' server-performance-compact' : ''}`}>
    <section className="server-section">
      <ServerIdentity project={project} sample={sample} target={target} running={sample?.running ?? true} />
      <div className="server-metrics">
        {[{ label: '进程 CPU 使用率', value: sample?.cpu, color: '#646cff' }, { label: '进程内存占用', value: sample?.memory, color: '#168b73', unit: ' MB' }, { label: '所在主机磁盘使用率', value: sample?.disk, color: '#c08a32' }].map((metric) => <div className="server-metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value == null ? '—' : `${metric.value.toFixed(1)}${metric.unit ?? '%'}`}</strong>{!metric.unit && <div className="server-meter"><i style={{ width: `${metric.value ?? 0}%`, backgroundColor: metric.color }} /></div>}</div>)}
        <div className="server-metric"><span>进程运行时间</span><strong className="server-uptime">{sample?.uptime ?? '—'}</strong><span className="server-metric-foot">{sample?.version ?? '—'}</span></div>
      </div>
    </section>
    <section className="server-section">
      <div className="server-toolbar"><h3>性能趋势</h3><div className="server-toolbar-actions"><Radio.Group optionType="button" buttonStyle="solid" value={range} options={[{ label: '15 分钟', value: 15 }, { label: '30 分钟', value: 30 }, { label: '1 小时', value: 60 }]} onChange={(event) => setRange(event.target.value)} /><Tooltip title={autoRefresh ? '暂停刷新' : '恢复刷新'}><Button aria-label={autoRefresh ? '暂停刷新' : '恢复刷新'} icon={autoRefresh ? <PauseCircleOutlined /> : <SyncOutlined />} onClick={() => setAutoRefresh(!autoRefresh)} disabled={!sample} /></Tooltip><Tooltip title="刷新"><Button aria-label="刷新监控" icon={<ReloadOutlined />} disabled={!sample} onClick={() => setRefreshedAt(dayjs().format('HH:mm:ss'))} /></Tooltip></div></div>
      <div className="server-chart-grid">
        <div className="server-chart"><h4>CPU</h4>{sample ? <EChart option={chartOption(times, [trend('CPU', sample.cpuTrend, '#646cff')], '%')} style={{ height: compact ? 160 : 240 }} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无监控数据" />}</div>
        <div className="server-chart"><h4>进程内存</h4>{sample ? <EChart option={chartOption(times, [trend('内存', sample.memoryTrend, '#168b73')], ' MB')} style={{ height: compact ? 160 : 240 }} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无监控数据" />}</div>
      </div>
      <div className="server-chart server-network"><h4>所在主机网络流量</h4>{sample ? <EChart option={chartOption(times, [trend('接收', sample.networkIn, '#168b73'), trend('发送', sample.networkOut, '#c08a32')], ' MB/s')} style={{ height: compact ? 160 : 220 }} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无监控数据" />}</div>
      <div className="server-update-time">{refreshedAt ? `更新时间 ${refreshedAt}` : '更新时间 —'}</div>
    </section>
  </div>
}

export type OperationRecord = { id: number; time: string; action: string; target: string; host: string; artifact: string; result: string }

export function OperationsWorkspace({ view, project, sample, target, history, onRecord, onStatusChange }: { view: 'update' | 'history'; project: string; sample?: ServerSample; target?: ProcessIdentity; history?: OperationRecord[]; onRecord?: (record: OperationRecord) => void; onStatusChange?: (running: boolean, version: string) => void }) {
  const { message, modal } = App.useApp()
  const running = sample?.running ?? true
  const [version, setVersion] = useState(sample?.version ?? '—')
  const [file, setFile] = useState<File | null>(null)
  const [artifact, setArtifact] = useState<File | null>(null)
  const [localRecords, setRecords] = useState<OperationRecord[]>([])
  const records = history ?? localRecords

  function record(action: string, filename: string) {
    const entry = { id: Date.now(), time: dayjs().format('YYYY-MM-DD HH:mm:ss'), action, target: sample?.name ?? '—', host: sample?.host ?? '—', artifact: filename, result: '演示完成' }
    if (onRecord) onRecord(entry)
    else setRecords((items) => [entry, ...items])
  }

  function confirmUpdate() {
    if (!sample || !artifact) return
    modal.confirm({
      title: '更新进程',
      content: <div className="server-confirm"><p>项目：{project}</p><p>进程：{sample.name}</p><p>主机：{sample.host ?? '—'}</p><p>运行目录：{sample.directory ?? '—'}</p><p>脚本：{sample.scripts?.update}</p><p>更新包：{artifact.name}</p></div>,
      okText: '确认更新',
      cancelText: '取消',
      onOk: () => {
        setVersion(artifact.name)
        onStatusChange?.(running, artifact.name)
        record('更新', artifact.name)
      },
    })
  }

  return <div className="admin-page server-page">
    {view === 'update' && <><section className="server-section"><ServerIdentity project={project} sample={sample} target={target} running={running} /><div className="server-details"><div><span>当前版本</span><strong>{version}</strong></div><div><span>运行目录</span><strong>{target?.directory ?? sample?.directory ?? '—'}</strong></div></div></section>
    <section className="server-section">
      <div className="server-toolbar"><h3>应用更新</h3></div>
      <Upload.Dragger accept=".jar" maxCount={1} showUploadList={false} disabled={!sample} beforeUpload={(selected) => {
        if (!selected.name.toLowerCase().endsWith('.jar')) { message.error('请选择 JAR 文件'); return Upload.LIST_IGNORE }
        setFile(selected)
        return false
      }}>
        <CloudUploadOutlined className="server-upload-icon" />
        <p className="server-upload-name">{file?.name ?? '选择 JAR 文件'}</p>
        <p className="server-upload-size">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '.jar'}</p>
      </Upload.Dragger>
      <div className="server-package-actions"><Space>{file && <Tooltip title="移除文件"><Button aria-label="移除 JAR" icon={<DeleteOutlined />} onClick={() => setFile(null)} /></Tooltip>}<Button icon={<UploadOutlined />} disabled={!file || !sample} onClick={() => { if (file) { setArtifact(file); record('上传 JAR', file.name) } }}>上传 JAR</Button></Space><Button type="primary" icon={<SyncOutlined />} disabled={!artifact || !sample?.scripts?.update} onClick={confirmUpdate}>更新</Button></div>
      <div className="server-staged"><span>待更新文件</span><strong>{artifact?.name ?? '—'}</strong>{artifact && <Tag color="processing">已选择</Tag>}</div>
    </section></>}
    {view === 'history' && <section className="server-section"><div className="server-toolbar"><h3>操作日志</h3><span className="server-record-count">共 {records.length} 条</span></div><Table<OperationRecord> rowKey="id" dataSource={records} tableLayout="fixed" scroll={{ x: 800 }} pagination={{ pageSize: 5, hideOnSinglePage: true }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无操作日志" /> }} columns={[
      { title: '时间', dataIndex: 'time', width: 190 }, { title: '操作', dataIndex: 'action', width: 100 }, { title: '目标进程', dataIndex: 'target', width: 140 }, { title: '主机 IP', dataIndex: 'host', width: 140 }, { title: '文件 / 版本', dataIndex: 'artifact', ellipsis: true }, { title: '结果', dataIndex: 'result', width: 120, render: (value: string) => <Tag color="success">{value}</Tag> },
    ]} /></section>}
  </div>
}
