<script lang="ts" setup>
import type { Rule } from 'ant-design-vue/es/form';

import type { FieldMapping } from '../types';

import { ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  AutoComplete,
  Button,
  Empty,
  FormItem,
  Input,
  Select,
  Tooltip,
} from 'ant-design-vue';

import {
  columnSources,
  isJsonType,
  SOURCE_PATTERN,
  useRowKey,
  valueTypes,
} from '../types';
import JsonConfiguration from './json-configuration.vue';

const fields = defineModel<FieldMapping[]>({ required: true });

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
const rowKey = useRowKey();
const expanded = ref<number[]>([]);

const sourceRules: Rule[] = [
  { message: '请输入取值来源', required: true, whitespace: true },
  {
    message: '自带列或 data.字段路径，例如 data.amount',
    pattern: SOURCE_PATTERN,
  },
];
const keyRules: Rule[] = [
  { message: '请输入结果字段', required: true, whitespace: true },
  {
    message: '字母、数字、下划线，以字母或下划线开头',
    pattern: /^[A-Z_]\w{0,63}$/i,
  },
  {
    validator: (_rule: Rule, value: string) =>
      fields.value.filter((item) => item.key === value?.trim()).length > 1
        ? Promise.reject(new Error('结果字段不能重复'))
        : Promise.resolve(),
  },
];
const sourceOptions = [
  ...columnSources.map((item) => ({
    label: `${item.value}（${item.label}）`,
    value: item.value,
  })),
  { label: 'data.字段名（业务字段）', value: 'data.' },
];
const labelRules: Rule[] = [
  { message: '请输入列标题', required: true, whitespace: true },
];
const requiredRules: Rule[] = [{ required: true }];

function add() {
  fields.value.push({ key: '', label: '', source: '', type: 'string' });
}

/** 选择自带列时带出类型、结果字段和描述；业务字段按路径最后一段填结果字段 */
function onSourceChange(field: FieldMapping) {
  const source = field.source?.trim() ?? '';
  const column = columnSources.find((item) => item.value === source);
  if (column) {
    field.type = column.type;
    field.key ||= column.value;
    field.label ||= column.label;
    return;
  }
  const last = source.startsWith('data.') ? source.split('.').pop() : '';
  if (last && /^[A-Z_]\w*$/i.test(last) && !field.key) field.key = last;
}

/** 自带列的类型是固定的：time 只能是时间，其余只能是文本或数字 */
function typeOptions(field: FieldMapping) {
  if (field.source === 'time') {
    return valueTypes.filter((item) => item.value === 'time');
  }
  if (columnSources.some((item) => item.value === field.source)) {
    return valueTypes.filter(
      (item) => item.value === 'string' || item.value === 'number',
    );
  }
  return valueTypes;
}

function remove(index: number) {
  fields.value.splice(index, 1);
}

function isExpanded(field: FieldMapping) {
  return expanded.value.includes(rowKey(field));
}

function toggle(field: FieldMapping) {
  field.json ??= { mappings: [], showMapped: true, showRaw: false };
  const key = rowKey(field);
  expanded.value = isExpanded(field)
    ? expanded.value.filter((item) => item !== key)
    : [...expanded.value, key];
}
</script>

<template>
  <div
    v-for="(field, index) in fields"
    :key="rowKey(field)"
    class="dc-mapping-group"
  >
    <div class="dc-mapping-row">
      <FormItem
        :name="['fields', index, 'source']"
        :rules="sourceRules"
        label="取值来源"
      >
        <AutoComplete
          v-model:value="field.source"
          :options="sourceOptions"
          placeholder="actor 或 data.amount"
          @blur="onSourceChange(field)"
          @select="onSourceChange(field)"
        />
      </FormItem>
      <FormItem
        :name="['fields', index, 'type']"
        :rules="requiredRules"
        label="类型"
      >
        <Select v-model:value="field.type" :options="typeOptions(field)" />
      </FormItem>
      <FormItem
        :name="['fields', index, 'key']"
        :rules="keyRules"
        label="结果字段"
      >
        <Input v-model:value="field.key" placeholder="结果字段" />
      </FormItem>
      <FormItem
        :name="['fields', index, 'label']"
        :rules="labelRules"
        label="列标题"
      >
        <Input v-model:value="field.label" placeholder="列标题" />
      </FormItem>
      <Tooltip title="移除字段">
        <Button
          aria-label="移除字段"
          class="dc-remove-field"
          @click="remove(index)"
        >
          <template #icon>
            <IconifyIcon class="size-4" icon="lucide:trash-2" />
          </template>
        </Button>
      </Tooltip>
    </div>
    <template v-if="isJsonType(field.type)">
      <div class="dc-mapping-actions">
        <Button size="small" @click="toggle(field)">
          <template #icon>
            <IconifyIcon
              :icon="
                isExpanded(field) ? 'lucide:chevron-up' : 'lucide:chevron-down'
              "
              class="size-4"
            />
          </template>
          {{ isExpanded(field) ? '收起映射' : '配置映射' }}
        </Button>
      </div>
      <JsonConfiguration
        v-if="field.json"
        v-show="isExpanded(field)"
        v-model:json="field.json"
        :index="index"
      />
    </template>
  </div>
  <Empty
    v-if="!fields.length"
    :image="simpleImage"
    description="暂无字段映射"
  />
  <Button @click="add">
    <template #icon>
      <IconifyIcon class="size-4" icon="lucide:plus" />
    </template>
    添加字段
  </Button>
</template>

<style scoped>
.dc-mapping-group {
  padding: 0 0 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid hsl(var(--border));
}

.dc-mapping-row {
  display: grid;
  grid-template-columns:
    minmax(160px, 1.3fr) minmax(110px, 0.8fr) minmax(120px, 1fr)
    minmax(120px, 1.1fr) 32px;
  gap: 12px;
}

.dc-mapping-row :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.dc-remove-field {
  margin-top: 30px;
}

.dc-mapping-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}

@media (max-width: 767px) {
  .dc-mapping-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0 12px;
  }

  .dc-remove-field {
    justify-self: end;
  }
}
</style>
