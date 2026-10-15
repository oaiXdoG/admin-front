import type {
  BackupInfo,
  LogStorage,
  LogStorageTestResult,
  LogStorageWrite,
  OperationLogParams,
  OperationLogRow,
  SystemSetting,
} from '#/api/types';

import { requestClient } from '#/api/request';

/** 不需要登录，登录页也会读取 */
export async function getSystemSettingApi() {
  return requestClient.post<SystemSetting>('/system/setting/get', {});
}

export async function updateSystemSettingApi(data: SystemSetting) {
  return requestClient.post<SystemSetting>('/system/setting/update', {
    ...data,
    appName: data.appName.trim(),
    copyright: data.copyright.trim(),
    loginDescription: data.loginDescription.trim(),
    loginTitle: data.loginTitle.trim(),
  });
}

export async function getLogStorageApi() {
  return requestClient.post<LogStorage>('/system/log-storage/get', {});
}

function trimLogStorage(data: LogStorageWrite) {
  return {
    adminPassword: data.adminPassword ?? '',
    adminUser: data.adminUser.trim(),
    database: data.database.trim(),
    url: data.url.trim(),
  };
}

export async function updateLogStorageApi(data: LogStorageWrite) {
  return requestClient.post<LogStorage>(
    '/system/log-storage/update',
    trimLogStorage(data),
  );
}

/** 用表单里的值测试连接，不保存 */
export async function testLogStorageApi(data: LogStorageWrite) {
  return requestClient.post<LogStorageTestResult>(
    '/system/log-storage/test',
    trimLogStorage(data),
  );
}

export async function updateLogRetentionApi(retentionDays: number) {
  return requestClient.post<{ retentionDays: number }>(
    '/system/log-storage/retention',
    { retentionDays },
  );
}

export async function getOperationLogsApi(params: OperationLogParams) {
  return requestClient.post<{ list: OperationLogRow[]; total: number }>(
    '/system/operation-log/list',
    params,
  );
}

export async function getBackupApi() {
  return requestClient.post<BackupInfo>('/system/backup/get', {});
}

export async function updateBackupApi(data: {
  enabled: boolean;
  keep: number;
  time: string;
}) {
  return requestClient.post<BackupInfo>('/system/backup/update', data);
}

/** 立即备份，在服务器后台执行，用 getBackupApi 查看进度 */
export async function runBackupApi() {
  return requestClient.post<BackupInfo>('/system/backup/run', {});
}

/** data 是 base64 编码的备份文件 */
export async function downloadBackupApi(name: string) {
  return requestClient.post<{ data: string; name: string }>(
    '/system/backup/download',
    { name },
  );
}

export async function removeBackupApi(name: string) {
  return requestClient.post<null>('/system/backup/remove', { name });
}
