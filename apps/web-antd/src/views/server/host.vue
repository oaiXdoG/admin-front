<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ServerRecord, ServerWrite } from '#/api/types';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { useClipboard } from '@vueuse/core';
import {
  Alert,
  Button,
  message,
  Modal,
  Tag,
  Typography,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm, z } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createServerApi,
  getInstallCommandApi,
  getServersApi,
  removeServerApi,
  updateServerApi,
} from '#/api';
import { useProjectStore } from '#/store';

import UsageCell from './components/usage-cell.vue';
import {
  formatBytes,
  ratio,
  serverStatusTags,
} from './format';

const REFRESH_MS = 5000;

const projectStore = useProjectStore();
const router = useRouter();
// legacy：HTTP 页面没有 navigator.clipboard，退回 execCommand 复制
const { copy } = useClipboard({ legacy: true });
const { hasAccessByCodes } = useAccess();
const projectId = computed(() => projectStore.currentProjectId as number);

const servers = ref<ServerRecord[]>([]);
/** null 为新建 */
const editing = ref<null | ServerRecord>(null);
const formOpen = ref(false);
const saving = ref(false);
const install = ref<null | { command: string; name: string }>(null);
let timer: ReturnType<typeof setInterval> | undefined;

/** 已有分组，新增或编辑服务器时可以直接选 */
const groupOptions = computed(() =>
  [...new Set(servers.value.map((item) => item.groupName).filter(Boolean))]
    .sort()
    .map((value) => ({ value })),
);

const [ServerForm, formApi] = useVbenForm({
  schema: [
    {
      component: 'Input',
      componentProps: { maxlength: 64, placeholder: '例如 game-01' },
      fieldName: 'name',
      label: '名称',
      rules: z.string().trim().min(1, { message: '请输入名称' }),
    },
    {
      component: 'AutoComplete',
      componentProps: () => ({
        allowClear: true,
        class: 'w-full',
        filterOption: (input: string, option: { value: string }) => option.value.toLowerCase().includes(input.toLowerCase()),
        maxlength: 64,
        options: groupOptions.value,
        placeholder: '选择已有分组或输入新分组，可空',
      }),
      fieldName: 'groupName',
      help: '用于分组显示和批量操作；下拉里是已有的分组，也可以直接输入新分组',
      label: '分组',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128, placeholder: '可空' },
      fieldName: 'remark',
      label: '备注',
    },
  ],
  showDefaultActions: false,
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { align: 'left', field: 'name', minWidth: 140, slots: { default: 'name' }, title: '名称' },
      {
        align: 'left',
        field: 'groupName',
        formatter: ({ cellValue }) => cellValue || '—',
        minWidth: 110,
        title: '分组',
      },
      { field: 'status', slots: { default: 'status' }, title: '状态', width: 90 },
      { align: 'left', field: 'hostname', minWidth: 200, slots: { default: 'host' }, title: '主机' },
      { align: 'left', field: 'cpu', minWidth: 170, slots: { default: 'cpu' }, title: 'CPU' },
      { align: 'left', field: 'memory', minWidth: 170, slots: { default: 'memory' }, title: '内存' },
      { align: 'left', field: 'disk', minWidth: 170, slots: { default: 'disk' }, title: '磁盘（/）' },
      { align: 'left', field: 'network', minWidth: 140, slots: { default: 'network' }, title: '网络' },
      { field: 'processCount', minWidth: 70, title: '进程' },
      {
        field: 'lastSeenAt',
        formatter: ({ cellValue }) => (cellValue ? dayjs(cellValue).format('MM-DD HH:mm:ss') : '—'),
        minWidth: 140,
        title: '最后心跳',
      },
      { field: 'operation', fixed: 'right', slots: { default: 'action' }, title: '操作', width: 240 },
    ],
    data: [],
    height: 'auto',
    pagerConfig: { enabled: false },
    rowConfig: { isHover: true, keyField: 'id' },
    // 单元格有两行内容，按内容撑开行高
    showOverflow: false,
    toolbarConfig: { custom: true, zoom: true },
  } as VxeTableGridOptions<ServerRecord>,
});

/** 自动刷新不显示加载状态，保留滚动位置 */
async function load() {
  const { list } = await getServersApi(projectId.value);
  servers.value = list;
  gridApi.setGridOptions({ data: list });
}

async function openForm(record: null | ServerRecord) {
  editing.value = record;
  formOpen.value = true;
  await formApi.resetForm();
  if (record) {
    await formApi.setValues({
      groupName: record.groupName,
      name: record.name,
      remark: record.remark,
    });
  }
}

async function save() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const values = await formApi.getValues<ServerWrite>();
  const data = {
    groupName: values.groupName ?? '',
    name: values.name,
    remark: values.remark ?? '',
  };
  saving.value = true;
  try {
    if (editing.value) {
      await updateServerApi(projectId.value, editing.value.id, data);
      message.success('服务器已修改');
    } else {
      const result = await createServerApi(projectId.value, data);
      install.value = { command: result.installCommand, name: data.name };
    }
    formOpen.value = false;
    await load();
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

function showInstall(record: ServerRecord) {
  const reinstall = record.status !== 'pending';
  const open = async () => {
    const { installCommand } = await getInstallCommandApi(projectId.value, record.id);
    install.value = { command: installCommand, name: record.name };
  };
  if (!reinstall) {
    void open();
    return;
  }
  Modal.confirm({
    cancelText: '取消',
    content: `「${record.name}」已经接入。重新执行安装命令会更换密钥，旧的 Agent 立即失效，用于重装 Agent 或密钥泄露时重置。`,
    okText: '生成安装命令',
    onOk: open,
    title: '重新安装 Agent',
  });
}

function remove(record: ServerRecord) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除服务器「${record.name}」？只删除后台的登记信息，服务器上的 Agent 需要手动卸载。`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除服务器',
    async onOk() {
      await removeServerApi(projectId.value, record.id);
      message.success('服务器已删除');
      await load();
    },
  });
}

function openMonitor(record: ServerRecord) {
  void router.push({ path: '/server/monitor', query: { serverId: String(record.id) } });
}

async function copyCommand() {
  if (!install.value) return;
  await copy(install.value.command);
  message.success('已复制');
}


onMounted(async () => {
  await load();
  timer = setInterval(() => void load().catch(() => undefined), REFRESH_MS);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="服务器列表">
      <template #toolbar-tools>
        <Button
          v-if="hasAccessByCodes(['server_host:create'])"
          type="primary"
          @click="openForm(null)"
        >
          <template #icon>
            <IconifyIcon class="size-4" icon="lucide:plus" />
          </template>
          新增服务器
        </Button>
      </template>
      <template #name="{ row }">
        <span class="font-medium">{{ row.name }}</span>
      </template>
      <template #status="{ row }">
        <Tag :color="serverStatusTags[row.status as keyof typeof serverStatusTags].color">
          {{ serverStatusTags[row.status as keyof typeof serverStatusTags].text }}
        </Tag>
      </template>
      <template #host="{ row }">
        <template v-if="row.status === 'pending'">
          <span class="text-muted-foreground">还没有安装 Agent</span>
        </template>
        <div v-else class="leading-relaxed">
          <div>
            {{ row.hostname }}
            <span class="text-muted-foreground text-xs"> · {{ row.cpuCores }} 核 · {{ formatBytes(row.memoryTotal) }}</span>
          </div>
          <div class="text-muted-foreground text-xs">
            公网 {{ row.ip || '—' }}<template v-if="row.privateIp"> · 内网 {{ row.privateIp.replaceAll(',', ', ') }}</template>
          </div>
        </div>
      </template>
      <template #cpu="{ row }">
        <UsageCell :detail="`1 分钟负载 ${row.metric?.load1?.toFixed(2) ?? '—'}`" :percent="row.metric?.cpu" />
      </template>
      <template #memory="{ row }">
        <UsageCell
          :detail="`${formatBytes(row.metric?.memoryUsed)} / ${formatBytes(row.metric?.memoryTotal)}`"
          :percent="row.metric ? ratio(row.metric.memoryUsed, row.metric.memoryTotal) : undefined"
        />
      </template>
      <template #disk="{ row }">
        <UsageCell
          :detail="`${formatBytes(row.metric?.diskUsed)} / ${formatBytes(row.metric?.diskTotal)}`"
          :percent="row.metric ? ratio(row.metric.diskUsed, row.metric.diskTotal) : undefined"
        />
      </template>
      <template #network="{ row }">
        <div v-if="row.metric" class="leading-relaxed">
          <div><span class="text-muted-foreground mr-1 text-xs">收</span>{{ formatBytes(row.metric.netIn) }}/s</div>
          <div><span class="text-muted-foreground mr-1 text-xs">发</span>{{ formatBytes(row.metric.netOut) }}/s</div>
        </div>
        <span v-else class="text-muted-foreground">—</span>
      </template>
      <template #action="{ row }">
        <Button
          :disabled="row.status === 'pending'"
          size="small"
          type="link"
          @click="openMonitor(row)"
        >
          监控
        </Button>
        <Button
          v-if="hasAccessByCodes(['server_host:update'])"
          size="small"
          type="link"
          @click="showInstall(row)"
        >
          安装命令
        </Button>
        <Button
          v-if="hasAccessByCodes(['server_host:update'])"
          size="small"
          type="link"
          @click="openForm(row)"
        >
          编辑
        </Button>
        <Button
          v-if="hasAccessByCodes(['server_host:remove'])"
          danger
          size="small"
          type="link"
          @click="remove(row)"
        >
          删除
        </Button>
      </template>
    </Grid>

    <Modal
      v-model:open="formOpen"
      :confirm-loading="saving"
      :title="editing ? '编辑服务器' : '新增服务器'"
      cancel-text="取消"
      destroy-on-close
      ok-text="保存"
      @ok="save"
    >
      <ServerForm />
    </Modal>

    <Modal
      :footer="null"
      :open="install !== null"
      :title="`安装 Agent：${install?.name ?? ''}`"
      :width="760"
      @cancel="install = null"
    >
      <template v-if="install">
        <div class="mb-4">
          <Alert
            message="用 root 登录这台服务器执行下面的命令（需要 Java 17 及以上）。命令 10 分钟内有效、只能用一次，过期后在列表里点「安装命令」重新生成。"
            show-icon
            type="info"
          />
        </div>
        <div class="server-command">{{ install.command }}</div>
        <div class="mt-4 flex justify-between">
          <Typography.Text type="secondary">
            执行成功后，几秒内列表里会显示这台服务器「在线」
          </Typography.Text>
          <Button type="primary" @click="copyCommand">
            <template #icon>
              <IconifyIcon class="size-4" icon="lucide:copy" />
            </template>
            复制命令
          </Button>
        </div>
      </template>
    </Modal>
</Page>
</template>

<style scoped>
.server-command {
  padding: 12px 16px;
  font-family: ui-monospace, monospace;
  font-size: 13px;
  word-break: break-all;
  background: hsl(var(--accent));
  border-radius: 6px;
}
</style>
