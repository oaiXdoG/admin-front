<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { Category, Template } from '../types';

import type {
  VxeGridPropTypes,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { DataQueryCondition } from '#/api/types';

import { computed, onMounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  message,
  RadioGroup,
  RangePicker,
  Select,
  Space,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getQueryTemplatesApi, queryDataApi } from '#/api';

import { flattenRow, parseTemplate } from '../types';

interface Condition {
  field?: string;
  id: number;
  max?: number;
  min?: number;
  number?: number;
  operator: string;
  range?: [Dayjs, Dayjs];
  text?: string;
  time?: Dayjs;
}

const props = defineProps<{
  category: Category;
  projectId: number;
}>();

const compare = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'ne' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'ge' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'le' },
  { label: '介于', value: 'between' },
];
const textCompare = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'ne' },
  { label: '包含', value: 'contains' },
];
const booleanCompare = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'ne' },
];
const booleanOptions = [
  { label: '是', value: 'true' },
  { label: '否', value: 'false' },
];
const relations = [
  { label: 'AND', value: 'and' },
  { label: 'OR', value: 'or' },
];
/** 用 getter 让快捷选项在点击时才取当前时间 */
function preset(label: string, start: () => Dayjs) {
  return {
    label,
    get value() {
      return [start(), dayjs()];
    },
  };
}
const timePresets = [
  preset('最近 1 小时', () => dayjs().subtract(1, 'hour')),
  preset('今天', () => dayjs().startOf('day')),
  preset('最近 7 天', () => dayjs().subtract(7, 'day')),
  preset('最近 30 天', () => dayjs().subtract(30, 'day')),
];

const templates = ref<Template[]>([]);
/** 当前连接的日志库，提示查询的是哪个环境 */
const database = ref('');
const templateId = ref<number>();
const conditions = ref<Condition[]>([]);
const relation = ref('and');
const timeRange = ref<[Dayjs, Dayjs]>([dayjs().subtract(1, 'day'), dayjs()]);
/** 点击查询时固定下来的参数，翻页时沿用 */
const submitted = ref<{
  conditions: DataQueryCondition[];
  endTime: number;
  relation: string;
  startTime: number;
  templateId: number;
}>();

const template = computed(() =>
  templates.value.find((item) => item.id === templateId.value),
);
const moduleOptions = computed(() =>
  templates.value.map((item) => ({ label: item.name, value: item.id })),
);
const queryFields = computed(() => template.value?.fields ?? []);
const fieldOptions = computed(() =>
  queryFields.value.map((item) => ({ label: item.label, value: item.key })),
);
const columns = computed<VxeGridPropTypes.Columns>(
  () =>
    template.value?.fields.flatMap((field) => {
      const raw = { field: field.key, minWidth: 160, title: field.label };
      if (field.type !== 'json' && field.type !== 'jsonText') return [raw];
      const rawColumns = !field.json || field.json.showRaw ? [raw] : [];
      const mapped = field.json?.showMapped
        ? (field.json.mappings ?? []).map((mapping) => ({
            field: `${field.key}:${mapping.path}`,
            minWidth: 160,
            title: mapping.label,
          }))
        : [];
      return [...rawColumns, ...mapped];
    }) ?? [],
);

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [],
    minHeight: 240,
    pagerConfig: { enabled: true, pageSize: 20, pageSizes: [20, 50, 100, 200] },
    proxyConfig: {
      autoLoad: false,
      ajax: {
        query: async ({ page }) => {
          const params = submitted.value;
          const current = template.value;
          if (!params || !current) return { items: [], total: 0 };
          const result = await queryDataApi(props.projectId, {
            ...params,
            page: page.currentPage,
            pageSize: page.pageSize,
          });
          database.value = result.database;
          return {
            items: result.list.map((row) => flattenRow(row, current.fields)),
            total: result.total,
          };
        },
      },
    },
    rowConfig: { keyField: '_logId' },
    toolbarConfig: { custom: true, zoom: true },
  } as VxeTableGridOptions,
});

watch(columns, (value) => gridApi.setGridOptions({ columns: value }));

const title = computed(() =>
  props.category === 'data' ? '数据查询' : '日志查询',
);

function fieldOf(condition: Condition) {
  return queryFields.value.find((item) => item.key === condition.field);
}

function operatorsOf(condition: Condition) {
  const type = fieldOf(condition)?.type;
  if (type === 'number' || type === 'time') return compare;
  if (type === 'boolean') return booleanCompare;
  return textCompare;
}

function clearValue(condition: Condition) {
  condition.text = undefined;
  condition.number = undefined;
  condition.min = undefined;
  condition.max = undefined;
  condition.time = undefined;
  condition.range = undefined;
}

function onFieldChange(condition: Condition) {
  condition.operator = 'eq';
  clearValue(condition);
}

function reset() {
  conditions.value = [];
  relation.value = 'and';
}

function onModuleChange() {
  reset();
  submitted.value = undefined;
  gridApi.setGridOptions({ data: [] });
}

function addCondition() {
  conditions.value.push({ id: Date.now(), operator: 'eq' });
}

function removeCondition(id: number) {
  conditions.value = conditions.value.filter((item) => item.id !== id);
}

/** 按字段类型把条件转换成接口格式，值不完整时返回 null */
function toRequest(condition: Condition): DataQueryCondition | null {
  const field = fieldOf(condition);
  if (!field) return null;
  const base = { field: field.key, operator: condition.operator };
  const between = condition.operator === 'between';
  if (field.type === 'time') {
    if (between) {
      return condition.range
        ? {
            ...base,
            value: String(condition.range[0].valueOf()),
            value2: String(condition.range[1].valueOf()),
          }
        : null;
    }
    return condition.time
      ? { ...base, value: String(condition.time.valueOf()) }
      : null;
  }
  if (field.type === 'number') {
    if (between) {
      return condition.min === undefined ||
        condition.min === null ||
        condition.max === undefined ||
        condition.max === null
        ? null
        : {
            ...base,
            value: String(condition.min),
            value2: String(condition.max),
          };
    }
    return condition.number === undefined || condition.number === null
      ? null
      : { ...base, value: String(condition.number) };
  }
  return condition.text === undefined || condition.text === ''
    ? null
    : { ...base, value: condition.text };
}

function search() {
  const current = template.value;
  if (!current) {
    message.warning('请选择查询模块');
    return;
  }
  const [start, end] = timeRange.value ?? [];
  if (!start || !end) {
    message.warning('请选择时间范围');
    return;
  }
  const requests = conditions.value.map((item) => toRequest(item));
  if (requests.includes(null)) {
    message.warning('请把查询条件填写完整');
    return;
  }
  submitted.value = {
    conditions: requests as DataQueryCondition[],
    endTime: end.valueOf(),
    relation: relation.value,
    startTime: start.valueOf(),
    templateId: current.id,
  };
  gridApi.query();
}

onMounted(async () => {
  const result = await getQueryTemplatesApi(props.projectId, props.category);
  database.value = result.database;
  templates.value = result.list.map(parseTemplate);
});
</script>

<template>
  <div class="dc-page">
    <section class="dc-section">
      <div class="dc-section-title">
        <h2>{{ title }}</h2>
        <Tag v-if="database" color="orange">日志库：{{ database }}</Tag>
        <Tag v-else>未配置日志存储</Tag>
      </div>
      <div class="dc-module">
        <label for="dc-module">查询模块</label>
        <Select
          id="dc-module"
          v-model:value="templateId"
          :options="moduleOptions"
          allow-clear
          placeholder="请选择查询模块"
          @change="onModuleChange"
        />
      </div>
      <div class="dc-module mt-4">
        <label for="dc-time">时间范围</label>
        <RangePicker
          id="dc-time"
          v-model:value="timeRange"
          :allow-clear="false"
          :presets="timePresets"
          class="dc-time"
          show-time
        />
      </div>
    </section>

    <section class="dc-section">
      <div class="dc-section-title">
        <h2>查询条件</h2>
        <RadioGroup
          v-model:value="relation"
          :disabled="conditions.length < 2"
          :options="relations"
          button-style="solid"
          option-type="button"
        />
      </div>
      <div
        v-for="condition in conditions"
        :key="condition.id"
        class="dc-condition"
      >
        <Select
          v-model:value="condition.field"
          :options="fieldOptions"
          aria-label="查询字段"
          class="dc-condition-field"
          placeholder="选择字段"
          @change="onFieldChange(condition)"
        />
        <Select
          v-model:value="condition.operator"
          :disabled="!fieldOf(condition)"
          :options="operatorsOf(condition)"
          aria-label="操作符"
          class="dc-condition-operator"
          @change="clearValue(condition)"
        />
        <div class="dc-condition-value">
          <template v-if="fieldOf(condition)?.type === 'time'">
            <RangePicker
              v-if="condition.operator === 'between'"
              v-model:value="condition.range"
              show-time
            />
            <DatePicker
              v-else
              v-model:value="condition.time"
              placeholder="选择时间"
              show-time
            />
          </template>
          <template v-else-if="fieldOf(condition)?.type === 'number'">
            <Space.Compact v-if="condition.operator === 'between'">
              <InputNumber v-model:value="condition.min" placeholder="最小值" />
              <InputNumber v-model:value="condition.max" placeholder="最大值" />
            </Space.Compact>
            <InputNumber
              v-else
              v-model:value="condition.number"
              placeholder="输入数值"
            />
          </template>
          <Select
            v-else-if="fieldOf(condition)?.type === 'boolean'"
            v-model:value="condition.text"
            :options="booleanOptions"
            placeholder="选择值"
          />
          <Input
            v-else
            v-model:value="condition.text"
            :disabled="!fieldOf(condition)"
            placeholder="输入条件值"
          />
        </div>
        <Tooltip title="移除条件">
          <Button aria-label="移除条件" @click="removeCondition(condition.id)">
            <template #icon>
              <IconifyIcon class="size-4" icon="lucide:x" />
            </template>
          </Button>
        </Tooltip>
      </div>
      <div v-if="!conditions.length" class="dc-condition-empty">
        暂无筛选条件
      </div>
      <div class="dc-query-actions">
        <Button :disabled="!queryFields.length" @click="addCondition">
          <template #icon>
            <IconifyIcon class="size-4" icon="lucide:plus" />
          </template>
          添加条件
        </Button>
        <Space>
          <Button @click="reset">重置</Button>
          <Button :disabled="!template" type="primary" @click="search">
            <template #icon>
              <IconifyIcon class="size-4" icon="lucide:search" />
            </template>
            查询
          </Button>
        </Space>
      </div>
    </section>

    <Grid table-title="查询结果">
      <template #empty>
        <Empty description="暂无查询结果" />
      </template>
    </Grid>
  </div>
</template>

<style scoped>
.dc-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dc-section {
  padding: 22px 24px;
  background: hsl(var(--card));
  border-block: 1px solid hsl(var(--border));
}

.dc-section h2 {
  margin: 0 0 18px;
  font-size: 15px;
  font-weight: 600;
  line-height: 24px;
}

.dc-section-title {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.dc-section-title h2 {
  margin: 0;
}

.dc-module {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 14px;
}

.dc-module :deep(.ant-select) {
  width: 320px;
  max-width: 100%;
}

.dc-module label {
  flex-shrink: 0;
  width: 70px;
}

.dc-module :deep(.dc-time) {
  width: 420px;
  max-width: 100%;
}

.dc-condition {
  display: grid;
  grid-template-columns:
    minmax(140px, 1fr) minmax(130px, 0.7fr) minmax(260px, 2fr)
    32px;
  gap: 12px;
  align-items: start;
  max-width: 1000px;
  margin-bottom: 12px;
}

.dc-condition-value :deep(.ant-picker),
.dc-condition-value :deep(.ant-input-number),
.dc-condition-value :deep(.ant-space-compact) {
  width: 100%;
}

.dc-condition-empty {
  padding: 18px 0 30px;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}

.dc-query-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid hsl(var(--border));
}

@media (max-width: 767px) {
  .dc-section {
    padding: 18px 14px;
  }

  .dc-module {
    flex-direction: column;
    gap: 8px;
    align-items: start;
  }

  .dc-module :deep(.ant-select) {
    width: 100%;
  }

  .dc-condition {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 32px;
  }

  .dc-condition > .dc-condition-field {
    grid-row: 1;
    grid-column: 1;
  }

  .dc-condition > .dc-condition-operator {
    grid-row: 1;
    grid-column: 2;
  }

  .dc-condition > .dc-condition-value {
    grid-row: 2;
    grid-column: 1 / 3;
  }

  .dc-condition > :deep(.ant-btn) {
    grid-row: 1;
    grid-column: 3;
  }
}
</style>
