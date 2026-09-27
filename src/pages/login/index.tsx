import { App, Button, Form, Input } from 'antd'
import { useState } from 'react'
import { login } from '@/services/login.ts'
import './login.css'

type LoginValues = {
  account: string
  password: string
}

export function LoginPage() {
  const { message } = App.useApp()
  const [submitting, setSubmitting] = useState(false)

  async function onFinish(values: LoginValues) {
    setSubmitting(true)
    try {
      await login(values.account, values.password)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-brand-icon">A</div>
        <div className="login-brand-name">admin-front</div>
        <div className="login-brand-caption">Project operations console</div>
      </div>
      <Form<LoginValues>
        className="login-form"
        layout="vertical"
        requiredMark={false}
        size="large"
        autoComplete="on"
        onFinish={onFinish}
      >
        <div className="login-mark">Welcome back</div>
        <h1 className="login-title">登录</h1>
        <Form.Item
          label="账号"
          name="account"
          rules={[
            { required: true, whitespace: true, message: '请输入账号' },
            { max: 64, message: '账号最长 64 位' },
          ]}
        >
          <Input
            variant="underlined"
            placeholder="请输入账号"
            autoComplete="username"
            maxLength={64}
            autoFocus
          />
        </Form.Item>
        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { max: 128, message: '密码最长 128 位' },
          ]}
        >
          <Input.Password
            variant="underlined"
            placeholder="请输入密码"
            autoComplete="current-password"
            maxLength={128}
          />
        </Form.Item>
        <Button
          className="login-submit"
          type="primary"
          htmlType="submit"
          loading={submitting}
          block
        >
          登录
        </Button>
      </Form>
    </div>
  )
}
