<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

import type {
  ManagedProcess,
  OperationRecord,
  ProcessValues,
  ServerSample,
} from '../store';

import type {
  VxeGridPropTypes,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { computed, h, reactive, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Drawer,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  InputPassword,
  message,
  Modal,
  RadioGroup,
  Space,
  Tag,
  Textarea,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useServerStore } from '../store';
import OperationsWorkspace from './operations-workspace.vue';
import PerformanceWorkspace from './performance-workspace.vue';

type Action = '关闭' | '重启';

const props = defineProps<{
  mode: 'monitor' | 'operations';
  project: string;
}>();

const serverStore = useServerStore();

const selectedId = ref<null | number>(serverStore.processes[0]?.id ?? null);
const panel = ref<'history' | 'update' | null>(null);
const editor = ref<'new' | ManagedProcess | null>(null);
const formRef = ref<FormInstance>();

function emptyValues(): ProcessValues {
  return {
    name: '',
    host: '',
    port: 22,
    username: '',
    authentication: 'key',
    directory: '',
    scripts: {},
    password: '',
    privateKey: '',
  };
}

const formState = reactive<ProcessValues>(emptyValues());

const rules: Record<string, Rule[]> = {
  name: [{ required: true, whitespace: true, message: '请输入进程名称' }],
  host: [{ required: true, whitespace: true, message: '请输入主机 IP' }],
  port: [{ required: true, type: 'number', message: '请输入 SSH 端口' }],
  username: [{ required: true, whitespace: true, message: '请输入登录用户' }],
  directory: [{ required: true, whitespace: true, message: '请输入运行目录' }],
};

const authenticationOptions = [
  { label: '密码', value: 'password' },
  { label: '密钥', value: 'key' },
];

const isOperations = computed(() => props.mode === 'operations');
const processes = computed(() => serverStore.processes);
const selected = computed(() =>
  processes.value.find((item) => item.id === selectedId.value),
);
const sample = computed<ServerSample | undefined>(() => {
  const process = selected.value;
  if (!process?.sample) return undefined;
  return {
    ...process.sample,
    name: process.name,
    host: process.host,
    directory: process.directory,
    scripts: process.scripts,
  };
});

function useColumns(operations: boolean): VxeGridPropTypes.Columns {
  return [
    {
      align: 'left',
      field: 'name',
      minWidth: operations ? 200 : 150,
      title: '进程名称',
    },
    { field: 'host', title: '主机 IP', width: operations ? 170 : 140 },
    {
      field: 'status',
      slots: { default: 'status' },
      title: '状态',
      width: operations ? 110 : 100,
    },
    ...(operations
      ? []
      : [
          {
            field: 'cpu',
            formatter: ({ row }: { row: ManagedProcess }) =>
              row.sample ? `${row.sample.cpu}%` : '—',
            title: '进程 CPU',
            width: 100,
          },
          {
            field: 'memory',
            formatter: ({ row }: { row: ManagedProcess }) =>
              row.sample ? `${row.sample.memory} MB` : '—',
            title: '进程内存',
            width: 110,
          },
        ]),
    {
      align: 'left',
      field: 'directory',
      minWidth: operations ? 260 : 200,
      title: '运行目录',
    },
    {
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: operations ? 520 : 110,
    },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        component: 'Input',
        componentProps: {
          allowClear: true,
          placeholder: '进程名称 / 主机 IP / 目录',
        },
        fieldName: 'keyword',
        label: '搜索',
      },
    ],
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(props.mode === 'operations'),
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      enabled: props.mode === 'operations',
      pageSize: 8,
      pageSizes: [8, 16, 32],
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues: { keyword?: string }) => {
          const search = formValues.keyword?.trim().toLowerCase() ?? '';
          const rows = processes.value.filter((item) =>
            `${item.name} ${item.host} ${item.directory}`
              .toLowerCase()
              .includes(search),
          );
          if (props.mode !== 'operations') {
            return { items: rows, total: rows.length };
          }
          const start = (page.currentPage - 1) * page.pageSize;
          return {
            items: rows.slice(start, start + page.pageSize),
            total: rows.length,
          };
        },
      },
    },
    rowClassName: ({ row }: { row: ManagedProcess }) =>
      row.id === selectedId.value ? 'server-selected-process' : '',
    rowConfig: { isCurrent: false, keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<ManagedProcess>,
});

// 进程列表变化后刷新表格，切换选中进程时重新渲染高亮行
watch(processes, () => gridApi.query(), { deep: true });
watch(selectedId, () => gridApi.grid?.updateData());

const drawerOpen = computed(
  () => isOperations.value && panel.value !== null && !!selected.value,
);
const drawerTitle = computed(
  () =>
    `${panel.value === 'update' ? '更新 JAR' : '操作日志'}${
      selected.value ? ` · ${selected.value.name} · ${selected.value.host}` : ''
    }`,
);

function statusOf(item: ManagedProcess) {
  if (!item.sample) return { color: 'default', label: '未连接' };
  return item.sample.running === false
    ? { color: 'warning', label: '已关闭' }
    : { color: 'success', label: '运行中' };
}

function configure(process: 'new' | ManagedProcess) {
  formRef.value?.clearValidate();
  const values: ProcessValues =
    process === 'new'
      ? emptyValues()
      : {
          name: process.name,
          host: process.host,
          port: process.port,
          username: process.username,
          authentication: process.authentication,
          directory: process.directory,
          scripts: { ...process.scripts },
          password: '',
          privateKey: '',
        };
  Object.assign(formState, values);
  editor.value = process;
}

async function save() {
  const current = editor.value;
  if (!current) return;
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  const {
    password: _password,
    privateKey: _privateKey,
    ...configuration
  } = formState;
  const id = current === 'new' ? Date.now() : current.id;
  const process: ManagedProcess = {
    ...(current === 'new' ? {} : current),
    ...configuration,
    scripts: { ...configuration.scripts },
    id,
    name: formState.name.trim(),
    host: formState.host.trim(),
    directory: formState.directory.trim(),
  };
  serverStore.updateProcesses((items) =>
    current === 'new'
      ? [...items, process]
      : items.map((item) => (item.id === id ? process : item)),
  );
  editor.value = null;
  selectedId.value = id;
  message.success('进程配置已更新');
}

function openPanel(process: ManagedProcess, view: 'history' | 'update') {
  selectedId.value = process.id;
  panel.value = view;
}

function confirmAction(process: ManagedProcess, action: Action) {
  if (!process.sample) return;
  Modal.confirm({
    title: `${action}进程`,
    content: h('div', { class: 'server-confirm' }, [
      h('p', `项目：${props.project}`),
      h('p', `进程：${process.name}`),
      h('p', `主机：${process.host}`),
      h('p', `运行目录：${process.directory}`),
      h(
        'p',
        `脚本：${(action === '重启' ? process.scripts.restart : process.scripts.close) ?? ''}`,
      ),
    ]),
    okText: `确认${action}`,
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: () =>
      serverStore.updateProcesses((items) =>
        items.map((item) =>
          item.id === process.id && item.sample
            ? {
                ...item,
                sample: { ...item.sample, running: action === '重启' },
                history: [
                  {
                    id: Date.now(),
                    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    action,
                    target: item.name,
                    host: item.host,
                    artifact: item.sample.version,
                    result: '演示完成',
                  },
                  ...(item.history ?? []),
                ],
              }
            : item,
        ),
      ),
  });
}

function onRecord(entry: OperationRecord) {
  const id = selected.value?.id;
  serverStore.updateProcesses((items) =>
    items.map((item) =>
      item.id === id
        ? { ...item, history: [entry, ...(item.history ?? [])] }
        : item,
    ),
  );
}

function onStatusChange(running: boolean, version: string) {
  const id = selected.value?.id;
  serverStore.updateProcesses((items) =>
    items.map((item) =>
      item.id === id && item.sample
        ? { ...item, sample: { ...item.sample, running, version } }
        : item,
    ),
  );
}
</script>

<template>
  <div class="admin-page" :class="{ 'server-monitor-layout': !isOperations }">
    <div v-if="!isOperations" class="server-monitor-dashboard">
      <PerformanceWorkspace
        v-if="selected"
        :key="selected.id"
        compact
        :project="project"
        :sample="sample"
        :target="selected"
      />
      <section v-else class="server-section">
        <Empty description="请选择进程" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      </section>
    </div>
    <div class="server-process-list">
      <Grid table-title="进程列表">
        <template #toolbar-tools>
          <Button v-if="isOperations" type="primary" @click="configure('new')">
            <IconifyIcon class="server-btn-icon" icon="lucide:plus" />
            新增进程
          </Button>
        </template>
        <template #status="{ row }">
          <Tag :color="statusOf(row).color">{{ statusOf(row).label }}</Tag>
        </template>
        <template #action="{ row }">
          <Button
            v-if="!isOperations"
            size="small"
            type="link"
            @click="selectedId = row.id"
          >
            查看监控
          </Button>
          <Space v-else :size="8">
            <Button
              :disabled="!row.scripts.update"
              size="small"
              type="link"
              @click="openPanel(row, 'update')"
            >
              <IconifyIcon class="server-btn-icon" icon="lucide:upload" />
              更新 JAR
            </Button>
            <Button
              :disabled="!row.sample || !row.scripts.restart"
              size="small"
              type="link"
              @click="confirmAction(row, '重启')"
            >
              <IconifyIcon class="server-btn-icon" icon="lucide:rotate-cw" />
              重启
            </Button>
            <Button
              danger
              :disabled="
                !row.sample ||
                !row.scripts.close ||
                row.sample.running === false
              "
              size="small"
              type="link"
              @click="confirmAction(row, '关闭')"
            >
              <IconifyIcon class="server-btn-icon" icon="lucide:circle-pause" />
              关闭
            </Button>
            <Button size="small" type="link" @click="openPanel(row, 'history')">
              <IconifyIcon class="server-btn-icon" icon="lucide:file-text" />
              操作日志
            </Button>
            <Button size="small" type="link" @click="configure(row)">
              <IconifyIcon class="server-btn-icon" icon="lucide:settings" />
              配置
            </Button>
          </Space>
        </template>
        <template #empty>
          <Empty description="暂无进程" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </template>
      </Grid>
    </div>
    <Drawer
      :body-style="{
        padding: '16px',
        background: 'hsl(var(--background-deep))',
      }"
      destroy-on-close
      :open="drawerOpen"
      placement="right"
      :title="drawerTitle"
      width="min(800px, 100vw)"
      @close="panel = null"
    >
      <OperationsWorkspace
        v-if="selected && panel"
        :key="`${selected.id}-${panel}`"
        :history="selected.history ?? []"
        :project="project"
        :sample="sample"
        :target="selected"
        :view="panel"
        @record="onRecord"
        @status-change="onStatusChange"
      />
    </Drawer>
    <Modal
      cancel-text="取消"
      ok-text="保存"
      :open="editor !== null"
      :title="editor === 'new' ? '新增进程' : '编辑进程配置'"
      :width="800"
      @cancel="editor = null"
      @ok="save"
    >
      <Form
        ref="formRef"
        class="server-process-form"
        layout="vertical"
        :model="formState"
        :required-mark="false"
        :rules="rules"
      >
        <FormItem label="进程名称" name="name">
          <Input v-model:value="formState.name" placeholder="请输入进程名称" />
        </FormItem>
        <div class="server-config-grid">
          <FormItem label="主机 IP" name="host">
            <Input
              v-model:value="formState.host"
              placeholder="请输入目标主机 IP"
            />
          </FormItem>
          <FormItem label="SSH 端口" name="port">
            <InputNumber
              v-model:value="formState.port"
              class="w-full"
              :max="65535"
              :min="1"
              :precision="0"
            />
          </FormItem>
        </div>
        <FormItem label="登录用户" name="username">
          <Input v-model:value="formState.username" autocomplete="off" />
        </FormItem>
        <FormItem label="认证方式" name="authentication">
          <RadioGroup
            v-model:value="formState.authentication"
            :options="authenticationOptions"
          />
        </FormItem>
        <FormItem
          v-if="formState.authentication === 'password'"
          label="登录密码"
          name="password"
        >
          <InputPassword
            v-model:value="formState.password"
            autocomplete="new-password"
            :placeholder="editor === 'new' ? '请输入密码' : '填写新密码'"
          />
        </FormItem>
        <FormItem v-else label="私钥" name="privateKey">
          <Textarea
            v-model:value="formState.privateKey"
            autocomplete="off"
            :placeholder="editor === 'new' ? '粘贴私钥' : '填写新私钥'"
            :rows="3"
          />
        </FormItem>
        <FormItem label="运行目录" name="directory">
          <Input
            v-model:value="formState.directory"
            placeholder="进程运行目录"
          />
        </FormItem>
        <div class="server-script-fields">
          <h4>操作脚本</h4>
          <FormItem label="更新脚本" :name="['scripts', 'update']">
            <Input
              v-model:value="formState.scripts.update"
              placeholder="脚本文件路径"
            />
          </FormItem>
          <FormItem label="重启脚本" :name="['scripts', 'restart']">
            <Input
              v-model:value="formState.scripts.restart"
              placeholder="脚本文件路径"
            />
          </FormItem>
          <FormItem label="关闭脚本" :name="['scripts', 'close']">
            <Input
              v-model:value="formState.scripts.close"
              placeholder="脚本文件路径"
            />
          </FormItem>
        </div>
      </Form>
    </Modal>
  </div>
</template>

<style scoped src="../server.css"></style>

<style scoped>
.admin-page.server-monitor-layout {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.server-monitor-dashboard {
  flex: 0 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
}

:deep(.server-selected-process > td) {
  background: hsl(var(--primary) / 10%);
}

.server-process-form {
  max-height: 65vh;
  padding: 8px 4px 0;
  overflow-y: auto;
}

.server-config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.server-script-fields {
  padding-top: 18px;
  border-top: 1px solid #edf0f5;
}

.server-script-fields h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
}

.admin-page:not(.server-monitor-layout) {
  height: 100%;
}

.server-process-list {
  height: 100%;
  min-height: 0;
}

.server-monitor-layout .server-process-list {
  flex: 1 0 320px;
  height: auto;
}

@media (max-width: 767px) {
  .server-config-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>

<style>
.server-confirm p {
  margin: 8px 0;
  overflow-wrap: anywhere;
}
</style>
