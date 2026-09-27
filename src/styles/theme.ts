import type { ThemeConfig } from 'antd'

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#646cff',
    colorInfo: '#646cff',
    borderRadius: 6,
    colorBgLayout: '#f5f7fb',
    colorBgContainer: '#ffffff',
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorBorderSecondary: '#e5e7eb',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    Layout: {
      siderBg: '#ffffff',
      headerBg: '#ffffff',
      bodyBg: '#f5f7fb',
      headerHeight: 56,
      headerPadding: '0 20px',
    },
    Menu: {
      itemBg: '#ffffff',
      itemColor: '#596273',
      itemHoverColor: '#646cff',
      itemSelectedColor: '#646cff',
      itemSelectedBg: '#eef0ff',
      itemBorderRadius: 6,
      itemHeight: 40,
      subMenuItemBg: '#ffffff',
    },
    Card: {
      headerHeight: 52,
      bodyPadding: 20,
    },
    Table: {
      headerBg: '#f8f9fc',
      headerColor: '#5b6472',
      rowHoverBg: '#f8f9ff',
    },
  },
}
