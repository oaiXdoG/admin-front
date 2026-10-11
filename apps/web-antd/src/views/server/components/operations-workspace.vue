<script lang="ts" setup>
import type { OperationRecord, ProcessIdentity, ServerSample } from '../store';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, h, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Empty,
  message,
  Modal,
  Space,
  Tag,
  Tooltip,
  Upload,
  UploadDragger,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import ServerIdentity from './server-identity.vue';

const props = withDefaults(
  defineProps<{
    history?: OperationRecord[];
    project: string;
    sample?: ServerSample;
    target?: ProcessIdentity;
    view: 'history' | 'update';
  }>(),
  { history: undefined, sample: undefined, target: undefined },
);

const emit = defineEmits<{
  record: [record: OperationRecord];
  statusChange: [running: boolean, version: string];
}>();

const running = computed(() => props.sample?.running ?? true);
const version = ref(props.sample?.version ?? '—');
const file = ref<File | null>(null);
const artifact = ref<File | null>(null);
const localRecords = ref<OperationRecord[]>([]);
const records = computed(() => props.history ?? localRecords.value);

const [HistoryGrid, historyGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'time', title: '时间', width: 180 },
      { field: 'action', title: '操作', width: 100 },
      { field: 'target', title: '目标进程', width: 140 },
      { field: 'host', title: '主机 IP', width: 140 },
      { align: 'left', field: 'artifact', minWidth: 160, title: '文件 / 版本' },
      {
        field: 'result',
        slots: { default: 'result' },
        title: '结果',
        width: 120,
      },
    ],
    keepSource: true,
    pagerConfig: { pageSize: 5, pageSizes: [5, 10, 20] },
    proxyConfig: {
      ajax: {
        query: async ({ page }) => {
          const start = (page.currentPage - 1) * page.pageSize;
          return {
            items: records.value.slice(start, start + page.pageSize),
            total: records.value.length,
          };
        },
      },
    },
    rowConfig: { keyField: 'id' },
  } as VxeTableGridOptions<OperationRecord>,
});

watch(records, () => historyGridApi.query());

function record(action: string, filename: string) {
  const entry: OperationRecord = {
    id: Date.now(),
    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    action,
    target: props.sample?.name ?? '—',
    host: props.sample?.host ?? '—',
    artifact: filename,
    result: '演示完成',
  };
  emit('record', entry);
  if (props.history === undefined) {
    localRecords.value = [entry, ...localRecords.value];
  }
}

function beforeUpload(selected: File) {
  if (!selected.name.toLowerCase().endsWith('.jar')) {
    message.error('请选择 JAR 文件');
    return Upload.LIST_IGNORE;
  }
  file.value = selected;
  return false;
}

function upload() {
  if (!file.value) return;
  artifact.value = file.value;
  record('上传 JAR', file.value.name);
}

function confirmUpdate() {
  const sample = props.sample;
  const selected = artifact.value;
  if (!sample || !selected) return;
  Modal.confirm({
    title: '更新进程',
    content: h('div', { class: 'server-confirm' }, [
      h('p', `项目：${props.project}`),
      h('p', `进程：${sample.name}`),
      h('p', `主机：${sample.host ?? '—'}`),
      h('p', `运行目录：${sample.directory ?? '—'}`),
      h('p', `脚本：${sample.scripts?.update ?? ''}`),
      h('p', `更新包：${selected.name}`),
    ]),
    okText: '确认更新',
    cancelText: '取消',
    onOk: () => {
      version.value = selected.name;
      emit('statusChange', running.value, selected.name);
      record('更新', selected.name);
    },
  });
}
</script>

<template>
  <div class="admin-page server-page">
    <template v-if="view === 'update'">
      <section class="server-section">
        <ServerIdentity
          :project="project"
          :running="running"
          :sample="sample"
          :target="target"
        />
        <div class="server-details">
          <div>
            <span>当前版本</span>
            <strong>{{ version }}</strong>
          </div>
          <div>
            <span>运行目录</span>
            <strong>{{ target?.directory ?? sample?.directory ?? '—' }}</strong>
          </div>
        </div>
      </section>
      <section class="server-section">
        <div class="server-toolbar"><h3>应用更新</h3></div>
        <UploadDragger
          accept=".jar"
          :before-upload="beforeUpload"
          :disabled="!sample"
          :max-count="1"
          :show-upload-list="false"
        >
          <IconifyIcon class="server-upload-icon" icon="lucide:cloud-upload" />
          <p class="server-upload-name">{{ file?.name ?? '选择 JAR 文件' }}</p>
          <p class="server-upload-size">
            {{ file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '.jar' }}
          </p>
        </UploadDragger>
        <div class="server-package-actions">
          <Space>
            <Tooltip v-if="file" title="移除文件">
              <Button aria-label="移除 JAR" @click="file = null">
                <IconifyIcon
                  class="server-btn-icon only"
                  icon="lucide:trash-2"
                />
              </Button>
            </Tooltip>
            <Button :disabled="!file || !sample" @click="upload">
              <IconifyIcon class="server-btn-icon" icon="lucide:upload" />
              上传 JAR
            </Button>
          </Space>
          <Button
            :disabled="!artifact || !sample?.scripts?.update"
            type="primary"
            @click="confirmUpdate"
          >
            <IconifyIcon class="server-btn-icon" icon="lucide:refresh-cw" />
            更新
          </Button>
        </div>
        <div class="server-staged">
          <span>待更新文件</span>
          <strong>{{ artifact?.name ?? '—' }}</strong>
          <Tag v-if="artifact" color="processing">已选择</Tag>
        </div>
      </section>
    </template>
    <section v-if="view === 'history'" class="server-section">
      <HistoryGrid table-title="操作日志">
        <template #result="{ row }">
          <Tag color="success">{{ row.result }}</Tag>
        </template>
        <template #empty>
          <Empty
            description="暂无操作日志"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </template>
      </HistoryGrid>
    </section>
  </div>
</template>

<style scoped src="../server.css"></style>

<style scoped>
.server-section {
  padding: 18px;
}

.server-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 24px;
}

.server-details span,
.server-staged > span {
  font-size: 13px;
  color: #7b8493;
}

.server-details strong {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.server-upload-icon {
  display: inline-block;
  width: 30px;
  height: 30px;
  color: #646cff;
}

.server-upload-name {
  margin: 12px 0 8px;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.server-upload-size {
  margin: 0;
  font-size: 12px;
  color: #8b95a4;
}

.server-package-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.server-staged {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  padding-top: 18px;
  margin-top: 20px;
  border-top: 1px solid #edf0f5;
}

.server-staged strong {
  font-size: 13px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

@media (max-width: 767px) {
  .server-details {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
