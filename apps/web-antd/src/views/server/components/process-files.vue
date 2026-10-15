<script lang="ts" setup>
import type { ProcessFileEntry, ProcessRecord } from '#/api/types';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { IconifyIcon } from '@vben/icons';

import { Breadcrumb, BreadcrumbItem, Button, Input, message, Modal, Spin, Table } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getProcessFileResultApi, requestProcessFileApi } from '#/api';

import { formatBytes } from '../format';

type FileOp = 'delete' | 'list' | 'read' | 'write';

/** 文件管理：浏览、编辑、删除工作目录下的文件，操作由 Agent 在下一次心跳时执行，页面轮询结果 */
const props = defineProps<{ process: ProcessRecord; projectId: number }>();

const POLL_MS = 500;
const GIVE_UP_MS = 40_000;

const { hasAccessByCodes } = useAccess();
const canWrite = computed(() => hasAccessByCodes(['server_process:file']));

/** 当前目录，相对工作目录，空为工作目录本身 */
const path = ref('');
const entries = ref<ProcessFileEntry[]>([]);
const loading = ref(false);
/** 正在编辑的文件，null 为没有打开 */
const editing = ref<null | { content: string; path: string }>(null);
const saving = ref(false);
let disposed = false;

const segments = computed(() => (path.value ? path.value.split('/') : []));

const columns = [
  { dataIndex: 'name', key: 'name', title: '名称' },
  { dataIndex: 'size', key: 'size', title: '大小', width: 110 },
  { dataIndex: 'modifiedAt', key: 'modifiedAt', title: '修改时间', width: 170 },
  { key: 'action', title: '操作', width: 80 },
];

function join(name: string) {
  return path.value ? `${path.value}/${name}` : name;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 发起文件操作并轮询结果；失败或超时时提示并返回 null */
async function runFileOp<T>(op: FileOp, target: string, content?: string): Promise<null | { data: T }> {
  try {
    const { opId } = await requestProcessFileApi(props.projectId, props.process.id, op, target, content);
    const deadline = Date.now() + GIVE_UP_MS;
    while (!disposed) {
      await sleep(POLL_MS);
      if (disposed) return null;
      const result = await getProcessFileResultApi<T>(props.projectId, opId);
      if (result.status === 'pending') {
        if (Date.now() < deadline) continue;
        message.error('操作超时，请确认服务器在线');
        return null;
      }
      if (result.status === 'timeout' || !result.success) {
        message.error(result.message || '操作超时，请确认服务器在线');
        return null;
      }
      return { data: result.data };
    }
    return null;
  } catch {
    // 错误信息已由请求拦截器提示
    return null;
  }
}

async function load(target = path.value) {
  loading.value = true;
  try {
    const result = await runFileOp<{ entries: ProcessFileEntry[] }>('list', target);
    if (result) {
      path.value = target;
      entries.value = result.data?.entries ?? [];
    }
  } finally {
    loading.value = false;
  }
}

function goTo(depth: number) {
  void load(segments.value.slice(0, depth).join('/'));
}

async function open(entry: ProcessFileEntry) {
  if (entry.dir) {
    await load(join(entry.name));
    return;
  }
  const target = join(entry.name);
  loading.value = true;
  try {
    const result = await runFileOp<{ content: string; size: number }>('read', target);
    if (result) editing.value = { content: result.data?.content ?? '', path: target };
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!editing.value) return;
  saving.value = true;
  try {
    const result = await runFileOp('write', editing.value.path, editing.value.content);
    if (result) {
      message.success('文件已保存');
      editing.value = null;
      await load();
    }
  } finally {
    saving.value = false;
  }
}

function remove(entry: ProcessFileEntry) {
  const target = join(entry.name);
  Modal.confirm({
    cancelText: '取消',
    content: entry.dir
      ? `删除目录「${target}」？会递归删除目录下的所有文件，不能恢复。`
      : `删除文件「${target}」？不能恢复。`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: entry.dir ? '删除目录' : '删除文件',
    async onOk() {
      const result = await runFileOp('delete', target);
      if (!result) return;
      message.success('已删除');
      await load();
    },
  });
}

onMounted(() => load(''));
onBeforeUnmount(() => {
  disposed = true;
});
</script>

<template>
  <div>
    <div class="mb-3 flex items-center justify-between gap-2">
      <Breadcrumb>
        <BreadcrumbItem>
          <a class="font-mono" @click="goTo(0)">{{ process.workDir }}</a>
        </BreadcrumbItem>
        <BreadcrumbItem v-for="(segment, index) in segments" :key="index">
          <a v-if="index < segments.length - 1" @click="goTo(index + 1)">{{ segment }}</a>
          <span v-else>{{ segment }}</span>
        </BreadcrumbItem>
      </Breadcrumb>
      <Button :loading="loading" size="small" @click="load()">
        <template #icon>
          <IconifyIcon class="size-4" icon="lucide:refresh-cw" />
        </template>
        刷新
      </Button>
    </div>
    <div class="text-muted-foreground mb-2 text-xs">
      修改或删除后不会自动重启进程
    </div>
    <Spin :spinning="loading" tip="等待 Agent 执行…">
      <Table
        :columns="columns"
        :data-source="entries"
        :pagination="false"
        :scroll="{ y: 520 }"
        row-key="name"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a class="inline-flex items-center gap-1.5 break-all" @click="open(record as ProcessFileEntry)">
              <IconifyIcon
                :class="record.dir ? 'text-amber-500' : 'text-muted-foreground'"
                :icon="record.dir ? 'lucide:folder' : 'lucide:file'"
                class="size-4 shrink-0"
              />
              {{ record.name }}
            </a>
          </template>
          <template v-else-if="column.key === 'size'">
            {{ record.dir ? '—' : formatBytes(record.size) }}
          </template>
          <template v-else-if="column.key === 'modifiedAt'">
            {{ record.modifiedAt ? dayjs(record.modifiedAt).format('YYYY-MM-DD HH:mm:ss') : '—' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Button v-if="canWrite" danger size="small" type="link" @click="remove(record as ProcessFileEntry)">
              删除
            </Button>
          </template>
        </template>
      </Table>
    </Spin>

    <Modal
      :mask-closable="false"
      :open="editing !== null"
      :title="editing ? editing.path : ''"
      :width="960"
      destroy-on-close
      @cancel="editing = null"
    >
      <template v-if="editing">
        <Input.TextArea
          v-model:value="editing.content"
          :auto-size="{ minRows: 16, maxRows: 32 }"
          :readonly="!canWrite"
          spellcheck="false"
          style="font-family: ui-monospace, monospace; font-size: 12px"
        />
      </template>
      <template #footer>
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground text-xs">
            <template v-if="canWrite">保存后不会自动重启进程</template>
          </span>
          <span>
            <Button :disabled="saving" @click="editing = null">关闭</Button>
            <Button v-if="canWrite" :loading="saving" type="primary" @click="save">保存</Button>
          </span>
        </div>
      </template>
    </Modal>
  </div>
</template>
