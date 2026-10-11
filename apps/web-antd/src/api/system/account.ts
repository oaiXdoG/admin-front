import type { AccountMembership, AccountRecord } from '#/api/types';

import { requestClient } from '#/api/request';

export async function getAccountListApi() {
  return requestClient.post<AccountRecord[]>('/account/list', {});
}

export async function createAccountApi(data: {
  account: string;
  password: string;
  username: string;
}) {
  return requestClient.post<AccountRecord>('/account/create', {
    account: data.account.trim(),
    password: data.password,
    username: data.username.trim(),
  });
}

export async function updateAccountApi(
  accountId: number,
  data: { password?: string; username: string },
) {
  return requestClient.post<null>('/account/update', {
    accountId,
    username: data.username.trim(),
    ...(data.password ? { password: data.password } : {}),
  });
}

export async function getAccountProjectsApi(accountId: number) {
  return requestClient.post<AccountMembership[]>('/account/project/list', {
    accountId,
  });
}

export async function updateAccountProjectsApi(
  accountId: number,
  memberships: AccountMembership[],
) {
  return requestClient.post<null>('/account/project/update', {
    accountId,
    memberships,
  });
}
