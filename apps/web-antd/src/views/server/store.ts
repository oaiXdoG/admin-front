import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import { useProjectStore } from '#/store';

export interface ProcessScripts {
  close?: string;
  restart?: string;
  update?: string;
}

export interface ServerSample {
  cpu: number;
  cpuTrend: number[];
  directory?: string;
  disk: number;
  host?: string;
  memory: number;
  memoryTrend: number[];
  name: string;
  networkIn: number[];
  networkOut: number[];
  running?: boolean;
  scripts?: ProcessScripts;
  times: string[];
  uptime: string;
  version: string;
}

export interface ProcessIdentity {
  directory?: string;
  host?: string;
  name: string;
}

export interface OperationRecord {
  action: string;
  artifact: string;
  host: string;
  id: number;
  result: string;
  target: string;
  time: string;
}

export interface ManagedProcess {
  authentication: 'key' | 'password';
  directory: string;
  history?: OperationRecord[];
  host: string;
  id: number;
  name: string;
  port: number;
  sample?: ServerSample;
  scripts: ProcessScripts;
  username: string;
}

export type ProcessValues = Omit<
  ManagedProcess,
  'history' | 'id' | 'sample'
> & {
  password?: string;
  privateKey?: string;
};

export const serverSample: ServerSample = {
  name: '示例服务器',
  version: 'app-1.2.0.jar',
  cpu: 28.4,
  memory: 61.2,
  disk: 43.8,
  uptime: '3 天 12 小时',
  times: [
    '18:00',
    '18:05',
    '18:10',
    '18:15',
    '18:20',
    '18:25',
    '18:30',
    '18:35',
    '18:40',
    '18:45',
    '18:50',
    '18:55',
  ],
  cpuTrend: [19, 22, 18, 32, 25, 28, 39, 31, 24, 26, 30, 28.4],
  memoryTrend: [54, 55, 55.8, 57, 57.2, 58, 59.1, 58.4, 59, 60.2, 61, 61.2],
  networkIn: [12, 18, 14, 23, 21, 17, 28, 25, 22, 17, 21, 19],
  networkOut: [7, 10, 9, 15, 13, 12, 17, 16, 14, 10, 14, 12],
};

export const sampleProcesses: ManagedProcess[] = [
  {
    id: 1,
    name: '进程 A',
    host: '192.0.2.10',
    port: 22,
    username: 'deploy',
    authentication: 'key',
    directory: '/srv/process-a',
    scripts: { update: 'update.sh', restart: 'restart.sh', close: 'stop.sh' },
    sample: {
      ...serverSample,
      name: '进程 A',
      memory: 480,
      memoryTrend: [420, 430, 435, 440, 445, 450, 455, 452, 460, 470, 478, 480],
    },
  },
  {
    id: 2,
    name: '进程 B',
    host: '192.0.2.10',
    port: 22,
    username: 'deploy',
    authentication: 'key',
    directory: '/srv/process-b',
    scripts: { update: 'update.sh', restart: 'restart.sh', close: 'stop.sh' },
    sample: {
      ...serverSample,
      name: '进程 B',
      cpu: 12.8,
      cpuTrend: [8, 10, 9, 14, 11, 12, 18, 15, 11, 10, 14, 12.8],
      memory: 256,
      memoryTrend: [220, 222, 224, 230, 236, 240, 245, 246, 248, 250, 252, 256],
    },
  },
  {
    id: 3,
    name: '进程 C',
    host: '192.0.2.20',
    port: 22,
    username: 'deploy',
    authentication: 'password',
    directory: '/srv/process-c',
    scripts: { restart: 'restart.sh', close: 'stop.sh' },
    sample: {
      ...serverSample,
      name: '进程 C',
      cpu: 7.2,
      memory: 128,
      disk: 28.6,
      cpuTrend: [3, 5, 4, 7, 6, 5, 9, 8, 6, 5, 8, 7.2],
      memoryTrend: [110, 112, 113, 116, 118, 120, 121, 122, 123, 125, 127, 128],
    },
  },
];

/**
 * 进程列表按项目保存，性能监控和运维操作两个页面共用
 */
export const useServerStore = defineStore('server-manage', () => {
  const projectStore = useProjectStore();
  const processesByProject = ref<Record<number, ManagedProcess[]>>({});

  const processes = computed<ManagedProcess[]>(() => {
    const projectId = projectStore.currentProjectId;
    return projectId === null
      ? []
      : (processesByProject.value[projectId] ?? []);
  });

  function updateProcesses(
    update: (items: ManagedProcess[]) => ManagedProcess[],
  ) {
    const projectId = projectStore.currentProjectId;
    if (projectId === null) return;
    processesByProject.value = {
      ...processesByProject.value,
      [projectId]: update(processesByProject.value[projectId] ?? []),
    };
  }

  function $reset() {
    processesByProject.value = {};
  }

  return { $reset, processes, updateProcesses };
});
