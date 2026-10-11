<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { Category, Template } from '../types';

import type {
  VxeGridPropTypes,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  RadioGroup,
  RangePicker,
  Select,
  Space,
  Tooltip,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

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
  templates: Template[];
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
const relations = [
  { label: 'AND', value: 'and' },
  { label: 'OR', value: 'or' },
];

const templateId = ref<number>();
const conditions = ref<Condition[]>([]);
const relation = ref('and');

const available = computed(() =>
  props.templates.filter((item) => item.category === props.category),
);
const template = computed(() =>
  available.value.find((item) => item.id === templateId.value),
);
const moduleOptions = computed(() =>
  available.value.map((item) => ({ label: item.name, value: item.id })),
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

// 查询接口尚未接入，结果表只按模板字段展示列
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [],
    data: [],
    minHeight: 240,
    pagerConfig: { enabled: true },
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
  return type === 'number' || type === 'time' ? compare : textCompare;
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
}

function addCondition() {
  conditions.value.push({ id: Date.now(), operator: 'eq' });
}

function removeCondition(id: number) {
  conditions.value = conditions.value.filter((item) => item.id !== id);
}
</script>

<template>
  <div class="dc-page">
    <section class="dc-section">
      <div class="dc-section-title">
        <h2>{{ title }}</h2>
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
          <Button disabled type="primary">
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
