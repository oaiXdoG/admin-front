<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { ConditionDraft, EventField } from '../types';

import type {
  VxeGridPropTypes,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { LogEventDict, LogQueryParams, LogRow } from '#/api/types';

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useAccess } from '@vben/access';
import { IconifyIcon } from '@vben/icons';

import { Button, message, Tag, Tooltip } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  exportLogsApi,
  getEventDictApi,
  getEventFieldsApi,
  getEventsApi,
  queryLogsApi,
} from '#/api';

import {
  displaySample,
  downloadCsv,
  parseEventFields,
  readDotPath,
  suggestType,
  timePresets,
  toCondition,
} from '../types';
import ConditionEditor from './condition-editor.vue';
import LogDetail from './log-detail.vue';

interface SearchValues {
  actor?: string;
  events?: string[];
  keyword?: string;
  server?: string;
  time?: [Dayjs, Dayjs];
}

/** 一次查询用到的参数和展示字段 */
interface Submitted {
  fields: EventField[];
  params: Omit<LogQueryParams, 'page' | 'pageSize'>;
}

const props = defineProps<{ projectId: number }>();

const route = useRoute();
const { hasAccessByCodes } = useAccess();

/** 从详情「查看该用户轨迹」或事件管理「查看日志」进来时带着 actor / event，默认查最近 7 天 */
const initialActor =
  typeof route.query.actor === 'string' ? route.query.actor : '';
const initialEvent =
  typeof route.query.event === 'string' ? route.query.event : '';

const dict = ref<Map<string, LogEventDict>>(new Map());
/** 每个事件的字段：优先用事件字典，没有配置时从日志读取（缓存） */
const fieldCache = new Map<string, EventField[]>();
const selectedEvents = ref<string[]>(initialEvent ? [initialEvent] : []);
const conditions = ref<ConditionDraft[]>([]);
const relation = ref('and');
const conditionFields = ref<EventField[]>([]);
const database = ref('');
const detail = ref<LogRow | null>(null);
const exporting = ref(false);

/** 事件选择的版本号：读字段是异步的，只采用最后一次选择的结果 */
let eventsVersion = 0;

/** 不能加字段条件时告诉用户原因 */
const conditionHint = computed(() => {
  if (selectedEvents.value.length === 0)
    return '在上方「事件」里选择事件（可多选），即可按它们的字段加条件';
  if (conditionFields.value.length === 0)
    return '所选事件最近 7 天没有日志，也没有配置字段说明，读不到字段';
  if (selectedEvents.value.length > 1)
    return '可选字段是所选事件字段的合集，没有该字段的事件不会命中';
  return '';
});

function eventLabel(event: string) {
  return dict.value.get(event)?.label || '';
}

function summary(row: LogRow) {
  const text = JSON.stringify(row.data ?? {});
  return text === '{}' ? '' : text;
}

const baseColumns: VxeGridPropTypes.Columns = [
  {
    field: 'time',
    formatter: ({ cellValue }) =>
      dayjs(cellValue).format('YYYY-MM-DD HH:mm:ss'),
    title: '时间',
    width: 170,
  },
  { field: 'event', slots: { default: 'event' }, title: '事件', width: 180 },
  { field: 'actor', slots: { default: 'actor' }, title: '用户', width: 140 },
  { field: 'server', title: '服务器', width: 120 },
];
const summaryColumn = {
  align: 'left' as const,
  field: 'data',
  minWidth: 360,
  slots: { default: 'summary' },
  title: '业务字段',
};

/** 单个事件且有字段时按字段成列（列 key 为 f0、f1…），否则显示整段业务字段 */
function columnsOf(fields: EventField[]): VxeGridPropTypes.Columns {
  if (fields.length === 0) return [...baseColumns, summaryColumn];
  return [
    ...baseColumns,
    ...fields.map((field, index) => ({
      field: `f${index}`,
      minWidth: 140,
      title: field.label || field.path,
    })),
  ];
}

function toTableRow(row: LogRow, fields: EventField[]) {
  const result: Record<string, unknown> = { ...row };
  fields.forEach((field, index) => {
    result[`f${index}`] = displaySample(
      readDotPath(row.data, field.path),
      field.type,
    );
  });
  return result;
}

/**
 * 多个事件的字段合集，按路径去重（先选的事件优先）。没有某字段的事件按该字段加条件时不会命中，
 * 所以可以用同名字段（例如 anchorId）跨事件查询。
 */
async function fieldsOfEvents(events: string[]) {
  const lists = await Promise.all(events.map((event) => fieldsOf(event)));
  const merged = new Map<string, EventField>();
  for (const field of lists.flat()) {
    const existing = merged.get(field.path);
    if (!existing) merged.set(field.path, field);
    else if (!existing.label && field.label)
      merged.set(field.path, { ...existing, label: field.label });
  }
  return [...merged.values()];
}

async function fieldsOf(event: string) {
  const configured = parseEventFields(dict.value.get(event)?.fields);
  if (configured.length > 0) return configured;
  const cached = fieldCache.get(event);
  if (cached) return cached;
  const result = await getEventFieldsApi(props.projectId, event, 7).catch(
    () => ({ fields: [], sample: undefined }),
  );
  const fields = result.fields.map((field) => ({
    label: '',
    path: field.path,
    type: suggestType(field.types, readDotPath(result.sample, field.path)),
  }));
  fieldCache.set(event, fields);
  return fields;
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    handleValuesChange: async (values: SearchValues, changed: string[]) => {
      if (!changed.includes('events')) return;
      const events = values.events ?? [];
      selectedEvents.value = events;
      const version = ++eventsVersion;
      const fields = await fieldsOfEvents(events);
      if (version !== eventsVersion) return;
      conditionFields.value = fields;
      // 保留新字段合集里仍然存在的条件
      const paths = new Set(fields.map((item) => item.path));
      conditions.value = conditions.value.filter(
        (item) => item.path === undefined || paths.has(item.path),
      );
    },
    showCollapseButton: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
    schema: [
      {
        component: 'RangePicker',
        componentProps: {
          allowClear: false,
          presets: timePresets(),
          showTime: true,
        },
        defaultValue: [
          dayjs().subtract(initialActor || initialEvent ? 7 : 1, 'day'),
          dayjs(),
        ],
        fieldName: 'time',
        formItemClass: 'md:col-span-2',
        label: '时间范围',
        rules: 'required',
      },
      {
        component: 'Select',
        componentProps: {
          allowClear: true,
          maxTagCount: 'responsive',
          mode: 'multiple',
          optionFilterProp: 'label',
          options: [],
          placeholder: '全部事件',
        },
        defaultValue: initialEvent ? [initialEvent] : [],
        fieldName: 'events',
        formItemClass: 'md:col-span-2',
        help: '选择事件后可按字段加条件（多选时为字段合集）；只选一个事件时结果按字段成列',
        label: '事件',
      },
      {
        // 内容由 form-conditions 插槽渲染，条件不放在表单值里
        component: 'Input',
        fieldName: 'conditions',
        formItemClass: 'col-span-full',
        label: '字段条件',
      },
      {
        component: 'Input',
        componentProps: { allowClear: true, placeholder: '用户 ID（主播或玩家），精确匹配' },
        defaultValue: initialActor,
        fieldName: 'actor',
        label: '用户',
      },
      {
        component: 'Input',
        componentProps: { allowClear: true, placeholder: '服务器标识' },
        fieldName: 'server',
        label: '服务器',
      },
      {
        component: 'Input',
        componentProps: {
          allowClear: true,
          placeholder: '在业务字段里搜索，例如订单号',
        },
        fieldName: 'keyword',
        label: '关键字',
      },
    ],
  },
  gridEvents: {
    cellClick: ({
      column,
      row,
    }: {
      column: { field?: string };
      row: LogRow;
    }) => {
      if (column.field !== 'actor') detail.value = row;
    },
  },
  gridOptions: {
    columns: columnsOf([]),
    height: 'auto',
    pagerConfig: { pageSize: 50, pageSizes: [20, 50, 100, 200] },
    proxyConfig: {
      autoLoad: false,
      ajax: {
        query: async ({ page }, values: SearchValues) => {
          const current = await prepare(values);
          if (!current) return { items: [], total: 0 };
          gridApi.setGridOptions({ columns: columnsOf(current.fields) });
          const result = await queryLogsApi(props.projectId, {
            ...current.params,
            page: page.currentPage,
            pageSize: page.pageSize,
          });
          database.value = result.database;
          return {
            items: result.list.map((row) => toTableRow(row, current.fields)),
            total: result.total,
          };
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'logId' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<LogRow>,
});

/** 表单值和字段条件转成查询参数；条件不完整时提示并返回 null */
async function prepare(values: SearchValues): Promise<null | Submitted> {
  const [start, end] = values.time ?? [dayjs().subtract(1, 'day'), dayjs()];
  const events = values.events ?? [];
  const fields = events.length === 1 ? await fieldsOf(events[0] as string) : [];
  const allFields = await fieldsOfEvents(events);
  const requests = conditions.value.map((item) =>
    toCondition(item, allFields),
  );
  if (requests.includes(null)) {
    message.warning('请把字段条件填写完整');
    return null;
  }
  return {
    fields,
    params: {
      actor: values.actor?.trim() || undefined,
      conditions: requests as NonNullable<(typeof requests)[number]>[],
      endTime: end.valueOf(),
      events,
      keyword: values.keyword?.trim() || undefined,
      relation: relation.value,
      server: values.server?.trim() || undefined,
      startTime: start.valueOf(),
    },
  };
}

/** 点用户 ID：按这个用户查（用户轨迹） */
async function filterActor(actor: string) {
  await gridApi.formApi.setFieldValue('actor', actor);
  await gridApi.formApi.submitForm();
}

async function loadEvents() {
  const { list } = await getEventsApi(props.projectId, 30).catch(() => ({
    list: [],
  }));
  const names = new Set(list.map((item) => item.event));
  const options = [
    ...list.map((item) => ({
      label: `${eventLabel(item.event) ? `${eventLabel(item.event)} ` : ''}${item.event}（${item.total}）`,
      value: item.event,
    })),
    // 配置过说明但最近 30 天没有上报的事件也可以选
    ...[...dict.value.keys()]
      .filter((event) => !names.has(event))
      .map((event) => ({
        label: `${eventLabel(event)} ${event}`.trim(),
        value: event,
      })),
  ];
  gridApi.formApi.updateSchema([
    { componentProps: { options }, fieldName: 'events' },
  ]);
}

async function exportCsv() {
  const values = await gridApi.formApi.getValues<SearchValues>();
  const current = await prepare(values);
  if (!current) return;
  exporting.value = true;
  try {
    const result = await exportLogsApi(props.projectId, current.params);
    const fieldColumns = current.fields.map((field) => ({
      title: field.label || field.path,
      value: (row: LogRow) =>
        displaySample(readDotPath(row.data, field.path), field.type),
    }));
    downloadCsv(
      `日志-${dayjs().format('YYYYMMDD-HHmmss')}.csv`,
      [
        {
          title: '时间',
          value: (row: LogRow) =>
            dayjs(row.time).format('YYYY-MM-DD HH:mm:ss.SSS'),
        },
        { title: '事件', value: (row: LogRow) => row.event },
        { title: '用户', value: (row: LogRow) => row.actor },
        { title: '服务器', value: (row: LogRow) => row.server },
        ...(fieldColumns.length > 0
          ? fieldColumns
          : [{ title: '业务字段', value: (row: LogRow) => row.data }]),
        { title: '日志 ID', value: (row: LogRow) => row.logId },
      ],
      result.list,
    );
    message.success(
      result.list.length >= 50_000
        ? '已导出前 5 万行，请缩小时间范围后分批导出'
        : `已导出 ${result.list.length} 行`,
    );
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    exporting.value = false;
  }
}

onMounted(async () => {
  const dictResult = await getEventDictApi(props.projectId);
  dict.value = new Map(dictResult.list.map((item) => [item.event, item]));
  await loadEvents();
  conditionFields.value = await fieldsOfEvents(selectedEvents.value);
  await gridApi.query();
});
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <LogDetail :row="detail" @close="detail = null" />
    <div class="min-h-0 flex-1">
      <Grid table-title="日志查询">
        <template #form-conditions>
          <ConditionEditor
            v-model="conditions"
            v-model:relation="relation"
            :fields="conditionFields"
            :hint="conditionHint"
          />
        </template>
        <template #toolbar-actions>
          <span v-if="database" class="ml-3">
            <Tag color="orange">日志库：{{ database }}</Tag>
          </span>
        </template>
        <template #toolbar-tools>
          <Button
            v-if="hasAccessByCodes(['log_query:export'])"
            :loading="exporting"
            @click="exportCsv"
          >
            <template #icon>
              <IconifyIcon class="size-4" icon="lucide:download" />
            </template>
            导出
          </Button>
        </template>
        <template #event="{ row }">
          <Tooltip :title="eventLabel(row.event) ? row.event : ''">
            <Tag color="blue">{{ eventLabel(row.event) || row.event }}</Tag>
          </Tooltip>
        </template>
        <template #actor="{ row }">
          <Button
            v-if="row.actor"
            class="!px-0"
            size="small"
            type="link"
            @click="filterActor(row.actor)"
          >
            {{ row.actor }}
          </Button>
          <span v-else class="text-muted-foreground">—</span>
        </template>
        <template #summary="{ row }">
          <span class="dc-summary">{{ summary(row) }}</span>
        </template>
      </Grid>
    </div>
  </div>
</template>

<style scoped>
.dc-summary {
  display: block;
  overflow: hidden;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
</style>
