<script lang="ts" setup>
import type { EventField } from './types';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { LogEventDict } from '#/api/types';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Empty,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getEventDictApi,
  getEventFieldsApi,
  getEventsApi,
  removeEventDictApi,
  saveEventDictApi,
} from '#/api';
import { useProjectStore } from '#/store';

import {
  displaySample,
  parseEventFields,
  readDotPath,
  suggestType,
  valueTypes,
} from './types';

/** 事件列表的一行：最近上报的事件和已配置说明的事件合在一起 */
interface EventRow {
  description: string;
  event: string;
  fieldCount: number;
  label: string;
  lastTime?: number;
  total?: number;
}

const projectStore = useProjectStore();
const router = useRouter();
const { hasAccessByCodes } = useAccess();
const projectId = computed(() => projectStore.currentProjectId as number);

const days = ref(7);
const dict = ref<LogEventDict[]>([]);
const loading = ref(false);
/** 读取事件失败的原因（例如还没有配置日志源），显示在空表格里 */
const eventError = ref('');

/** 编辑中的事件说明 */
const editing = ref<LogEventDict | null>(null);
const editFields = ref<EventField[]>([]);
const samples = ref<Record<string, unknown>>({});
const discovering = ref(false);
const saving = ref(false);

const dayOptions = [7, 30, 90].map((value) => ({
  label: `最近 ${value} 天`,
  value,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { align: 'left', field: 'event', minWidth: 180, title: '事件名' },
      {
        align: 'left',
        field: 'label',
        formatter: ({ cellValue }) => cellValue || '—',
        minWidth: 140,
        title: '中文名',
      },
      {
        align: 'left',
        field: 'description',
        minWidth: 200,
        showOverflow: true,
        title: '说明',
      },
      { field: 'fieldCount', title: '字段说明', width: 100 },
      {
        field: 'total',
        formatter: ({ cellValue }) =>
          cellValue === undefined ? '—' : cellValue,
        title: '条数',
        width: 100,
      },
      {
        field: 'lastTime',
        formatter: ({ cellValue }) =>
          cellValue ? dayjs(cellValue).format('YYYY-MM-DD HH:mm:ss') : '—',
        title: '最后上报',
        width: 170,
      },
      {
        field: 'operation',
        fixed: 'right',
        slots: { default: 'action' },
        title: '操作',
        width: 200,
      },
    ],
    data: [],
    height: 'auto',
    pagerConfig: { enabled: false },
    rowConfig: { keyField: 'event' },
  } as VxeTableGridOptions<EventRow>,
});

async function load() {
  loading.value = true;
  try {
    const [dictResult, eventResult] = await Promise.all([
      getEventDictApi(projectId.value),
      getEventsApi(projectId.value, days.value).then(
        (result) => {
          eventError.value = '';
          return result;
        },
        (error) => {
          // 业务错误由请求拦截器抛出原始响应，原因在 data.message 里
          eventError.value =
            (error as { data?: { message?: string } })?.data?.message ??
            '读取事件失败';
          return { list: [] };
        },
      ),
    ]);
    dict.value = dictResult.list;
    const rows = new Map<string, EventRow>();
    for (const item of eventResult.list) {
      rows.set(item.event, {
        description: '',
        event: item.event,
        fieldCount: 0,
        label: '',
        lastTime: item.lastTime,
        total: item.total,
      });
    }
    for (const item of dict.value) {
      const row = rows.get(item.event) ?? ({ event: item.event } as EventRow);
      rows.set(item.event, {
        ...row,
        description: item.description,
        fieldCount: parseEventFields(item.fields).length,
        label: item.label,
      });
    }
    gridApi.setGridOptions({ data: [...rows.values()] });
  } finally {
    loading.value = false;
  }
}

function hasDict(event: string) {
  return dict.value.some((item) => item.event === event);
}

function openEditor(row: EventRow) {
  const existing = dict.value.find((item) => item.event === row.event);
  editing.value = {
    description: existing?.description ?? '',
    event: row.event,
    fields: existing?.fields ?? '[]',
    label: existing?.label ?? '',
  };
  editFields.value = parseEventFields(existing?.fields);
  samples.value = {};
  if (editFields.value.length === 0) void discover();
}

/** 从日志里读字段：没配置过的字段追加到列表，并带上样例值 */
async function discover() {
  if (!editing.value) return;
  discovering.value = true;
  try {
    const result = await getEventFieldsApi(
      projectId.value,
      editing.value.event,
      30,
    );
    const known = new Set(editFields.value.map((item) => item.path));
    const map: Record<string, unknown> = {};
    for (const field of result.fields) {
      const sample = readDotPath(result.sample, field.path);
      map[field.path] = sample;
      if (!known.has(field.path)) {
        editFields.value.push({
          label: '',
          path: field.path,
          type: suggestType(field.types, sample),
        });
      }
    }
    samples.value = map;
    if (result.fields.length === 0)
      message.info('最近 30 天没有这个事件的日志');
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    discovering.value = false;
  }
}

async function save() {
  if (!editing.value) return;
  saving.value = true;
  try {
    await saveEventDictApi(projectId.value, {
      ...editing.value,
      fields: JSON.stringify(
        editFields.value.map((item) => ({
          ...(item.hidden ? { hidden: true } : {}),
          label: item.label.trim(),
          path: item.path.trim(),
          type: item.type,
        })),
      ),
      label: editing.value.label.trim(),
    });
    message.success('事件说明已保存');
    editing.value = null;
    await load();
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

function remove(row: EventRow) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除「${row.event}」的中文名和字段说明？不会删除日志。`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除事件说明',
    async onOk() {
      await removeEventDictApi(projectId.value, row.event);
      message.success('已删除');
      await load();
    },
  });
}

function viewLogs(event: string) {
  router.push({ name: 'log_query', query: { event } });
}

onMounted(load);
</script>

<template>
  <Page auto-content-height>
    <div class="flex h-full flex-col gap-3">
      <div class="dc-bar">
        <Space>
          <Select
            v-model:value="days"
            :options="dayOptions"
            class="w-[140px]"
            @change="load"
          />
          <Button :loading="loading" @click="load">
            <template #icon>
              <IconifyIcon class="size-4" icon="lucide:refresh-cw" />
            </template>
            刷新
          </Button>
        </Space>
        <span class="text-muted-foreground text-sm">
          中文名和字段说明只影响日志查询的展示，不配置也能查询
        </span>
      </div>
      <div class="min-h-0 flex-1">
        <Grid table-title="事件">
          <template #action="{ row }">
            <Button
              v-if="hasAccessByCodes(['log_event:update'])"
              size="small"
              type="link"
              @click="openEditor(row)"
            >
              编辑说明
            </Button>
            <Button
              v-if="
                hasAccessByCodes(['log_event:remove']) && hasDict(row.event)
              "
              danger
              size="small"
              type="link"
              @click="remove(row)"
            >
              删除说明
            </Button>
            <Button size="small" type="link" @click="viewLogs(row.event)">
              查看日志
            </Button>
          </template>
          <template #empty>
            <Empty
              :description="eventError || `最近 ${days} 天没有上报过日志`"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />
          </template>
        </Grid>
      </div>
    </div>

    <Modal
      :confirm-loading="saving"
      :open="editing !== null"
      :title="`事件说明：${editing?.event ?? ''}`"
      :width="900"
      cancel-text="取消"
      destroy-on-close
      ok-text="保存"
      @cancel="editing = null"
      @ok="save"
    >
      <template v-if="editing">
        <div class="dc-basic">
          <span>中文名</span>
          <Input
            v-model:value="editing.label"
            :maxlength="64"
            placeholder="例如 支付成功"
          />
          <span>说明</span>
          <Input
            v-model:value="editing.description"
            :maxlength="256"
            placeholder="可空，例如 玩家充值到账时上报"
          />
        </div>
        <div class="mb-2 mt-5 flex items-center justify-between">
          <span class="font-medium">字段说明</span>
          <Button :loading="discovering" size="small" @click="discover">
            从日志读取字段
          </Button>
        </div>
        <Spin :spinning="discovering">
          <div class="dc-fields">
            <div class="dc-field dc-field-head">
              <span>字段路径（data.）</span>
              <span>中文名</span>
              <span>类型</span>
              <span>样例值</span>
              <span>
                列表显示
                <Tooltip title="关闭后不在日志查询的列表里单独成列，字段条件、详情和导出里仍有">
                  <IconifyIcon class="inline size-3.5 align-[-2px]" icon="lucide:circle-help" />
                </Tooltip>
              </span>
              <span></span>
            </div>
            <div
              v-for="(field, index) in editFields"
              :key="field.path"
              class="dc-field"
            >
              <span class="break-all font-mono text-xs">{{ field.path }}</span>
              <Input
                v-model:value="field.label"
                placeholder="不填则显示字段路径"
              />
              <Select v-model:value="field.type" :options="valueTypes" />
              <span class="dc-sample">
                {{
                  field.path in samples
                    ? displaySample(samples[field.path], field.type)
                    : ''
                }}
              </span>
              <Switch
                :checked="!field.hidden"
                size="small"
                @change="(checked) => (field.hidden = !checked)"
              />
              <Tooltip title="移除">
                <Button size="small" @click="editFields.splice(index, 1)">
                  <template #icon>
                    <IconifyIcon class="size-4" icon="lucide:x" />
                  </template>
                </Button>
              </Tooltip>
            </div>
            <Empty
              v-if="editFields.length === 0"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              description="还没有字段说明，点「从日志读取字段」"
            />
          </div>
        </Spin>
      </template>
    </Modal>
  </Page>
</template>

<style scoped>
.dc-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: hsl(var(--card));
  border-radius: 8px;
}

.dc-basic {
  display: grid;
  grid-template-columns: 56px 1fr 40px 2fr;
  gap: 12px;
  align-items: center;
}

.dc-fields {
  max-height: 50vh;
  overflow: auto;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.dc-field {
  display: grid;
  grid-template-columns: minmax(160px, 1.2fr) minmax(140px, 1fr) 120px minmax(
      120px,
      1fr
    ) 80px 32px;
  gap: 12px;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.dc-field:last-child {
  border-bottom: none;
}

.dc-field-head {
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--card));
}

.dc-sample {
  overflow: hidden;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
