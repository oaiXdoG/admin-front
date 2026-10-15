import type { ServerStatus, ServerTaskRecord } from '#/api/types';

export function formatBytes(value?: null | number) {
  if (value === undefined || value === null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatPercent(value?: null | number) {
  return value === undefined || value === null ? '—' : `${value.toFixed(1)}%`;
}

export function ratio(used?: number, total?: number) {
  return used !== undefined && total ? (used / total) * 100 : undefined;
}

/** 秒数转成「3 天 4 小时」这样的时长 */
export function formatDuration(seconds?: null | number) {
  if (seconds === undefined || seconds === null || seconds < 0) return '—';
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  return `${Math.max(minutes, 0)} 分钟`;
}

export const serverStatusTags: Record<ServerStatus, { color: string; text: string }> = {
  offline: { color: 'error', text: '离线' },
  online: { color: 'success', text: '在线' },
  pending: { color: 'default', text: '未接入' },
};

const UNKNOWN_STATE = { color: 'default', text: '未知' };

/** systemd 的 ActiveState */
const processStateTags: Record<string, { color: string; text: string }> = {
  activating: { color: 'processing', text: '启动中' },
  active: { color: 'success', text: '运行中' },
  deactivating: { color: 'processing', text: '停止中' },
  failed: { color: 'error', text: '异常退出' },
  inactive: { color: 'default', text: '已停止' },
  unknown: UNKNOWN_STATE,
};

export function processStateTag(state?: string) {
  return processStateTags[state ?? 'unknown'] ?? UNKNOWN_STATE;
}

export const actionNames: Record<ServerTaskRecord['action'], string> = {
  deploy: '部署',
  remove: '删除',
  restart: '重启',
  start: '启动',
  stop: '停止',
};

export const taskStatusTags: Record<
  ServerTaskRecord['status'],
  { color: string; text: string }
> = {
  failed: { color: 'error', text: '失败' },
  running: { color: 'processing', text: '执行中' },
  success: { color: 'success', text: '成功' },
  timeout: { color: 'warning', text: '超时' },
  waiting: { color: 'default', text: '等待' },
};
