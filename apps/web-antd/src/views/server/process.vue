<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  JvmTemplateRecord,
  ProcessRecord,
  ProcessTypeRecord,
  ServerRecord,
} from '#/api/types';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button, Drawer, message, Modal, Select, Space, Tag, Tooltip } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getJvmTemplatesApi,
  getProcessesApi,
  getProcessTypesApi,
  getServersApi,
  operateProcessesApi,
  removeProcessApi,
} from '#/api';
import { useProjectStore } from '#/store';

import DeployModal from './components/deploy-modal.vue';
import ProcessDetail from './components/process-detail.vue';
import ProcessForm from './components/process-form.vue';
import TaskList from './components/task-list.vue';
import TemplateModal from './components/template-modal.vue';
import TypeModal from './components/type-modal.vue';
import {
  actionNames,
  formatBytes,
  formatDuration,
  formatPercent,
  processStateTag,
  serverStatusTags,
} from './format';

type Action = 'restart' | 'start' | 'stop';

/** 有未完成的指令时每秒刷新，及时看到结果；否则每 5 秒 */
const REFRESH_MS = 5000;
const BUSY_REFRESH_MS = 1000;

const projectStore = useProjectStore();
const router = useRouter();
const { hasAccessByCodes } = useAccess();
const projectId = computed(() => projectStore.currentProjectId as number);
const canOperate = computed(() => hasAccessByCodes(['server_process:operate']));

const processes = ref<ProcessRecord[]>([]);
const servers = ref<ServerRecord[]>([]);
const templates = ref<JvmTemplateRecord[]>([]);
const types = ref<ProcessTypeRecord[]>([]);
const serverFilter = ref<number>();
const typeFilter = ref<number>();
const selected = ref<number[]>([]);
const formOpen = ref(false);
const editing = ref<null | ProcessRecord>(null);
const templateOpen = ref(false);
const typeOpen = ref(false);
const deploying = ref<null | ProcessRecord>(null);
const tasksOpen = ref(false);
const detailId = ref<null | number>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let unmounted = false;

const serverOptions = computed(() =>
  servers.value.map((item) => ({ label: item.name, value: item.id })),
);
const typeOptions = computed(() =>
  types.value.map((item) => ({ label: item.name, value: item.id })),
);
const visible = computed(() =>
  processes.value.filter(
    (item) =>
      (serverFilter.value === undefined || item.serverId === serverFilter.value) &&
      (typeFilter.value === undefined || item.typeId === typeFilter.value),
  ),
);
const detail = computed(() => processes.value.find((item) => item.id === detailId.value) ?? null);

const [Grid, gridApi] = useVbenVxeGrid({
  gridEvents: {
    checkboxAll: syncSelection,
    checkboxChange: syncSelection,
  },
  gridOptions: {
    checkboxConfig: { highlight: true, reserve: true },
    columns: [
      { type: 'checkbox', width: 44 },
      {
        align: 'left',
        field: 'name',
        minWidth: 180,
        slots: { default: 'name' },
        title: '进程',
      },
      {
        field: 'typeName',
        align: 'left',
        formatter: ({ cellValue }) => cellValue || '—',
        minWidth: 100,
        title: '类型',
      },
      {
        align: 'left',
        field: 'serverName',
        minWidth: 130,
        slots: { default: 'server' },
        title: '服务器',
      },
      { field: 'state', minWidth: 200, slots: { default: 'state' }, title: '状态' },
      { field: 'pid', formatter: ({ row }) => row.metric?.pid || '—', title: 'PID', minWidth: 90 },
      { field: 'cpu', formatter: ({ row }) => formatPercent(row.metric?.cpu), title: 'CPU', minWidth: 80 },
      {
        field: 'memory',
        formatter: ({ row }) => formatBytes(row.metric?.memory),
        title: '内存',
        minWidth: 100,
      },
      { field: 'threads', formatter: ({ row }) => row.metric?.threads ?? '—', title: '线程', minWidth: 70 },
      {
        field: 'uptime',
        formatter: ({ row }) =>
          row.state === 'active' && row.metric?.startedAt
            ? formatDuration((Date.now() - row.metric.startedAt) / 1000)
            : '—',
        title: '运行时长',
        minWidth: 120,
      },
      { field: 'port', formatter: ({ cellValue }) => cellValue || '—', title: '端口', minWidth: 80 },
      {
        align: 'left',
        field: 'deployedAt',
        minWidth: 170,
        slots: { default: 'deployed' },
        title: '最近部署',
      },
      {
        field: 'operation',
        fixed: 'right',
        slots: { default: 'action' },
        title: '操作',
        width: 370,
      },
    ],
    data: [],
    height: 'auto',
    pagerConfig: { enabled: false },
    rowConfig: { isHover: true, keyField: 'id' },
    // 进程名和备注两行显示，按内容撑开行高
    showOverflow: false,
    toolbarConfig: { custom: true, zoom: true },
  } as VxeTableGridOptions<ProcessRecord>,
});

function syncSelection() {
  selected.value = (gridApi.grid?.getCheckboxRecords(true) ?? []).map((item: ProcessRecord) => item.id);
}

/** 自动刷新不显示加载状态；有指令刚完成时提示结果 */
async function load() {
  const before = new Map(processes.value.map((item) => [item.id, item.task]));
  const { list } = await getProcessesApi(projectId.value);
  processes.value = list;
  gridApi.setGridOptions({ data: visible.value });
  for (const item of list) {
    const previous = before.get(item.id);
    if (previous && !item.task) {
      message.info(`${item.name}：${actionNames[previous.action]}指令已结束，结果见执行记录`);
    }
  }
  scheduleRefresh();
}

async function loadOptions() {
  const [serverResult, templateResult, typeResult] = await Promise.all([
    getServersApi(projectId.value),
    getJvmTemplatesApi(projectId.value),
    getProcessTypesApi(projectId.value),
  ]);
  servers.value = serverResult.list;
  templates.value = templateResult.list;
  types.value = typeResult.list;
}

function onFilterChange() {
  gridApi.setGridOptions({ data: visible.value });
}

function openForm(record: null | ProcessRecord) {
  if (!record && servers.value.length === 0) {
    message.warning('请先在「服务器列表」里添加服务器');
    return;
  }
  editing.value = record;
  formOpen.value = true;
}

async function onSaved() {
  formOpen.value = false;
  await Promise.all([load(), loadOptions()]);
}

async function onDeployed() {
  deploying.value = null;
  await load();
}

function busy(record: ProcessRecord) {
  return record.task !== null || record.serverStatus !== 'online';
}

function operate(records: ProcessRecord[], action: Action) {
  const names = records.map((item) => item.name).join('、');
  const run = async () => {
    await operateProcessesApi(projectId.value, records.map((item) => item.id), action);
    message.success(`已下发${actionNames[action]}指令`);
    gridApi.grid?.clearCheckboxRow();
    selected.value = [];
    await load();
  };
  if (action === 'start') {
    void run();
    return;
  }
  Modal.confirm({
    cancelText: '取消',
    content: `${actionNames[action]} ${names}？${action === 'stop' ? '进程会先收到正常退出信号，60 秒没有退出再强制结束。' : ''}`,
    okButtonProps: { danger: action === 'stop' },
    okText: actionNames[action],
    onOk: run,
    title: `${actionNames[action]}进程`,
  });
}

function operateSelected(action: Action) {
  const records = processes.value.filter((item) => selected.value.includes(item.id));
  if (records.some((item) => busy(item))) {
    message.warning('选中的进程里有服务器离线或还有未完成的指令');
    return;
  }
  operate(records, action);
}

function remove(record: ProcessRecord) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除进程「${record.name}」？会删除服务器上的 systemd 服务 adm-${record.name}，不删除工作目录和文件。`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除进程',
    async onOk() {
      await removeProcessApi(projectId.value, record.id);
      message.success('进程已删除');
      await load();
    },
  });
}

function openMonitor(record: ProcessRecord) {
  void router.push({
    path: '/server/monitor',
    query: { processId: String(record.id), serverId: String(record.serverId) },
  });
}

const taskStateTexts: Record<string, string> = {
  deploy: '部署中',
  remove: '删除中',
  restart: '重启中',
  start: '启动中',
  stop: '停止中',
};

/** 只显示一个状态：服务器离线 > 指令执行中 > 进程状态（配置改过未重启时显示待重启） */
function stateTag(record: ProcessRecord) {
  if (record.serverStatus !== 'online') return serverStatusTags[record.serverStatus];
  if (record.task) return { color: 'processing', text: taskStateTexts[record.task.action] ?? '执行中' };
  if (record.pendingRestart) return { color: 'warning', text: '运行中（待重启）' };
  return processStateTag(record.state);
}

/** 每次加载后重新安排下一次刷新（发起指令后立即加载，随即切到每秒刷新） */
function scheduleRefresh() {
  clearTimeout(timer);
  if (unmounted) return;
  const busy = processes.value.some((item) => item.task !== null);
  timer = setTimeout(() => void load().catch(() => scheduleRefresh()), busy ? BUSY_REFRESH_MS : REFRESH_MS);
}

onMounted(async () => {
  await Promise.all([load(), loadOptions()]);
});
onBeforeUnmount(() => {
  unmounted = true;
  clearTimeout(timer);
});
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="进程管理">
      <template #toolbar-actions>
        <span class="ml-3">
          <Select
            v-model:value="serverFilter"
            :options="serverOptions"
            allow-clear
            class="w-[180px]"
            placeholder="全部服务器"
            size="small"
            @change="onFilterChange"
          />
        </span>
        <span class="ml-2">
          <Select
            v-model:value="typeFilter"
            :options="typeOptions"
            allow-clear
            class="w-[140px]"
            placeholder="全部类型"
            size="small"
            @change="onFilterChange"
          />
        </span>
      </template>
      <template #toolbar-tools>
        <Space>
          <template v-if="canOperate && selected.length > 0">
            <span class="text-muted-foreground text-sm">已选 {{ selected.length }} 个</span>
            <Button @click="operateSelected('start')">启动</Button>
            <Button @click="operateSelected('restart')">重启</Button>
            <Button danger @click="operateSelected('stop')">停止</Button>
          </template>
          <Button @click="tasksOpen = true">执行记录</Button>
          <Button @click="typeOpen = true">进程类型</Button>
          <Button @click="templateOpen = true">JVM 模板</Button>
          <Button
            v-if="hasAccessByCodes(['server_process:create'])"
            type="primary"
            @click="openForm(null)"
          >
            <template #icon>
              <IconifyIcon class="size-4" icon="lucide:plus" />
            </template>
            新增进程
          </Button>
        </Space>
      </template>
      <template #server="{ row }">
        <span>{{ row.serverName }}</span>
      </template>
      <template #name="{ row }">
        <div class="font-medium">{{ row.name }}</div>
        <div v-if="row.remark || row.templateName" class="text-muted-foreground text-xs">
          {{ row.remark }}<template v-if="row.remark && row.templateName"> · </template>
          <template v-if="row.templateName">模板 {{ row.templateName }}</template>
        </div>
      </template>
      <template #state="{ row }">
        <Tooltip :title="!row.task && row.pendingRestart ? '配置已修改，重启后生效' : undefined">
          <Tag :color="stateTag(row).color">{{ stateTag(row).text }}</Tag>
        </Tooltip>
      </template>
      <template #deployed="{ row }">
        <template v-if="row.deployedAt">
          <div>{{ dayjs(row.deployedAt).format('YYYY-MM-DD HH:mm') }}</div>
          <div v-if="row.deployRemark" class="text-muted-foreground break-all text-xs">
            {{ row.deployRemark }}
          </div>
        </template>
        <span v-else>—</span>
      </template>
      <template #action="{ row }">
        <template v-if="canOperate">
          <Button
            v-if="row.state !== 'active'"
            :disabled="busy(row)"
            size="small"
            type="link"
            @click="operate([row], 'start')"
          >
            启动
          </Button>
          <template v-else>
            <Button :disabled="busy(row)" size="small" type="link" @click="operate([row], 'restart')">
              重启
            </Button>
            <Button :disabled="busy(row)" danger size="small" type="link" @click="operate([row], 'stop')">
              停止
            </Button>
          </template>
        </template>
        <Button
          v-if="hasAccessByCodes(['server_process:deploy'])"
          :disabled="busy(row)"
          size="small"
          type="link"
          @click="deploying = row"
        >
          部署
        </Button>
        <Button size="small" type="link" @click="openMonitor(row)">监控</Button>
        <Button size="small" type="link" @click="detailId = row.id">详情</Button>
        <Button
          v-if="hasAccessByCodes(['server_process:update'])"
          size="small"
          type="link"
          @click="openForm(row)"
        >
          编辑
        </Button>
        <Button
          v-if="hasAccessByCodes(['server_process:remove'])"
          :disabled="row.task !== null"
          danger
          size="small"
          type="link"
          @click="remove(row)"
        >
          删除
        </Button>
      </template>
    </Grid>

    <ProcessForm
      :open="formOpen"
      :project-id="projectId"
      :record="editing"
      :servers="servers"
      :templates="templates"
      :types="types"
      @close="formOpen = false"
      @saved="onSaved"
    />
    <TemplateModal
      :open="templateOpen"
      :project-id="projectId"
      :templates="templates"
      @changed="loadOptions(); load()"
      @close="templateOpen = false"
    />
    <TypeModal
      :open="typeOpen"
      :project-id="projectId"
      :types="types"
      @changed="loadOptions(); load()"
      @close="typeOpen = false"
    />
    <DeployModal
      :process="deploying"
      :project-id="projectId"
      @close="deploying = null"
      @deployed="onDeployed"
    />
    <ProcessDetail :process="detail" :project-id="projectId" @close="detailId = null" />
    <Drawer :open="tasksOpen" :width="760" destroy-on-close title="执行记录" @close="tasksOpen = false">
      <TaskList :process-id="null" :project-id="projectId" />
    </Drawer>
  </Page>
</template>
