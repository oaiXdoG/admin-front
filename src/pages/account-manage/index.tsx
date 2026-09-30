import { App } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import { createAccount } from '@/services/account-create.ts'
import { fetchAccounts } from '@/services/account-list.ts'
import { fetchRoles } from '@/services/role.ts'
import { fetchAccountProjects, updateAccount, updateAccountProjects } from '@/services/account-command.ts'
import type { LayoutOutletContext } from '@/layouts/context.ts'
import type { AccountRecord } from '@/types/api.ts'
import { AccountWorkspace } from './workspace.tsx'
import type { AccountCreateValues } from './workspace.tsx'

export function AccountManagePage() {
  const { message } = App.useApp()
  const { projects } = useOutletContext<LayoutOutletContext>()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const load = useCallback(async () => {
    setLoading(true)
    try { setAccounts(await fetchAccounts()) } catch (error) { message.error(error instanceof Error ? error.message : '获取用户失败') }
    finally { setLoading(false) }
  }, [message])

  useEffect(() => { void load() }, [load])

  async function onCreate(values: AccountCreateValues) {
    await createAccount(values)
    await load()
  }

  return <AccountWorkspace accounts={accounts} loading={loading} projects={projects?.projects ?? []} onReload={load} onCreate={onCreate} loadRoles={fetchRoles} onUpdate={updateAccount} loadMemberships={fetchAccountProjects} onSaveMemberships={updateAccountProjects} />
}
