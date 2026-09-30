import { App, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { createRoot } from 'react-dom/client'
import { theme } from '@/styles/theme.ts'
import { DataCenterPreview } from '@/pages/data-center/workspace.tsx'

createRoot(document.getElementById('root')!).render(<ConfigProvider theme={theme} locale={zhCN}><App><DataCenterPreview /></App></ConfigProvider>)
