<script lang="ts" setup>
import type { ConditionDraft, EventField } from '../types';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  DatePicker,
  Input,
  InputNumber,
  RadioGroup,
  RangePicker,
  Select,
  Space,
  Tooltip,
} from 'ant-design-vue';

/** 按事件字段加条件：数字和时间可比较大小，文本可包含，是/否只能等于 */
/** hint：不能加条件时的说明，例如还没有只选一个事件 */
const props = defineProps<{ fields: EventField[]; hint?: string }>();
const conditions = defineModel<ConditionDraft[]>({ required: true });
const relation = defineModel<string>('relation', { required: true });

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

const fieldOptions = computed(() =>
  props.fields.map((item) => ({
    label: item.label ? `${item.label}（${item.path}）` : item.path,
    value: item.path,
  })),
);

function fieldOf(condition: ConditionDraft) {
  return props.fields.find((item) => item.path === condition.path);
}

function operatorsOf(condition: ConditionDraft) {
  const type = fieldOf(condition)?.type;
  if (type === 'number' || type === 'time') return compare;
  if (type === 'boolean') return booleanCompare;
  return textCompare;
}

function clear(condition: ConditionDraft) {
  condition.text = undefined;
  condition.number = undefined;
  condition.min = undefined;
  condition.max = undefined;
  condition.time = undefined;
  condition.range = undefined;
}

function add() {
  conditions.value.push({ id: Date.now(), operator: 'eq' });
}
</script>

<template>
  <div class="dc-conditions">
    <div class="dc-head">
      <Button :disabled="fields.length === 0" size="small" @click="add">
        <template #icon>
          <IconifyIcon class="size-4" icon="lucide:plus" />
        </template>
        添加条件
      </Button>
      <RadioGroup
        v-if="conditions.length > 1"
        v-model:value="relation"
        :options="[
          { label: '全部满足', value: 'and' },
          { label: '任一满足', value: 'or' },
        ]"
        button-style="solid"
        option-type="button"
        size="small"
      />
      <span v-if="hint" class="text-muted-foreground text-sm">{{ hint }}</span>
    </div>
    <div
      v-for="(condition, index) in conditions"
      :key="condition.id"
      class="dc-row"
    >
      <Select
        v-model:value="condition.path"
        :options="fieldOptions"
        placeholder="选择字段"
        show-search
        @change="
          () => {
            condition.operator = 'eq';
            clear(condition);
          }
        "
      />
      <Select
        v-model:value="condition.operator"
        :disabled="!fieldOf(condition)"
        :options="operatorsOf(condition)"
        @change="clear(condition)"
      />
      <div class="dc-value">
        <template v-if="fieldOf(condition)?.type === 'time'">
          <RangePicker
            v-if="condition.operator === 'between'"
            v-model:value="condition.range"
            show-time
          />
          <DatePicker v-else v-model:value="condition.time" show-time />
        </template>
        <template v-else-if="fieldOf(condition)?.type === 'number'">
          <Space.Compact v-if="condition.operator === 'between'">
            <InputNumber v-model:value="condition.min" placeholder="最小值" />
            <InputNumber v-model:value="condition.max" placeholder="最大值" />
          </Space.Compact>
          <InputNumber
            v-else
            v-model:value="condition.number"
            placeholder="数值"
          />
        </template>
        <Select
          v-else-if="fieldOf(condition)?.type === 'boolean'"
          v-model:value="condition.text"
          :options="[
            { label: '是', value: 'true' },
            { label: '否', value: 'false' },
          ]"
          placeholder="选择"
        />
        <Input
          v-else
          v-model:value="condition.text"
          :disabled="!fieldOf(condition)"
          placeholder="输入值"
        />
      </div>
      <Tooltip title="移除条件">
        <Button size="small" @click="conditions.splice(index, 1)">
          <template #icon>
            <IconifyIcon class="size-4" icon="lucide:x" />
          </template>
        </Button>
      </Tooltip>
    </div>
  </div>
</template>

<style scoped>
.dc-conditions {
  width: 100%;
}

.dc-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  min-height: 32px;
}

.dc-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) 120px minmax(240px, 2fr) 32px;
  gap: 12px;
  align-items: center;
  max-width: 960px;
  margin-top: 10px;
}

.dc-value :deep(.ant-picker),
.dc-value :deep(.ant-input-number),
.dc-value :deep(.ant-space-compact) {
  width: 100%;
}
</style>
