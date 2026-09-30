import { App, ConfigProvider, Layout, Menu, Select } from 'antd'
import { DashboardOutlined, SettingOutlined } from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ProcessWorkspace, sampleProcesses } from '@/pages/server-manage/processes.tsx'
import type { ManagedProcess } from '@/pages/server-manage/processes.tsx'
import { theme } from '@/styles/theme.ts'
import '@/styles/global.css'
import '@/layouts/basic-layout.css'
import '@/pages/data-center/data-center.css'

function ServerPreview() {
  const [mode, setMode] = useState('monitor')
  const [processes, setProcesses] = useState<ManagedProcess[]>(sampleProcesses)
  const options = [{ value: 'monitor', label: '性能监控' }, { value: 'operations', label: '运维操作' }]
  return <Layout className="dc-shell">
    <Layout.Sider theme="light" width={216} className="dc-sidebar"><div className="dc-brand"><SettingOutlined /><span>服务器管理</span></div><Menu mode="inline" selectedKeys={[mode]} defaultOpenKeys={['server']} onClick={({ key }) => setMode(key)} items={[{ key: 'server', label: '服务器管理', children: [{ key: 'monitor', label: '性能监控', icon: <DashboardOutlined /> }, { key: 'operations', label: '运维操作', icon: <SettingOutlined /> }] }]} /></Layout.Sider>
    <Layout><Layout.Header className="dc-header"><span className="dc-breadcrumb">服务器管理 / <strong>{mode === 'monitor' ? '性能监控' : '运维操作'}</strong></span><Select className="dc-mobile-nav" aria-label="页面" value={mode} options={options} onChange={setMode} /><span>示例项目</span></Layout.Header><Layout.Content className={`dc-content${mode === 'monitor' ? ' server-preview-monitor-content' : ''}`}><ProcessWorkspace mode={mode as 'monitor' | 'operations'} project="示例项目" processes={processes} onChange={setProcesses} /></Layout.Content></Layout>
  </Layout>
}

createRoot(document.getElementById('root')!).render(<ConfigProvider theme={theme} locale={zhCN}><App><ServerPreview /></App></ConfigProvider>)
