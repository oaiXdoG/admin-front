<script lang="ts" setup>
import type { Rule } from 'ant-design-vue/es/form';

import type { FieldMapping } from '../types';

import { ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Empty,
  FormItem,
  Input,
  Select,
  Tooltip,
} from 'ant-design-vue';

import { isJsonType, sourceTypes, useRowKey, valueTypes } from '../types';
import JsonConfiguration from './json-configuration.vue';

const fields = defineModel<FieldMapping[]>({ required: true });

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
const rowKey = useRowKey();
const expanded = ref<number[]>([]);

const sourceRules: Rule[] = [
  { message: '请输入源字段', required: true, whitespace: true },
];
const keyRules: Rule[] = [
  { message: '请输入返回字段', required: true, whitespace: true },
];
const labelRules: Rule[] = [
  { message: '请输入字段描述', required: true, whitespace: true },
];
const requiredRules: Rule[] = [{ required: true }];

function add() {
  fields.value.push({
    key: '',
    label: '',
    source: '',
    sourceType: 'txt',
    type: 'string',
  });
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
        label="源字段"
      >
        <Input v-model:value="field.source" placeholder="源字段" />
      </FormItem>
      <FormItem
        :name="['fields', index, 'sourceType']"
        :rules="requiredRules"
        label="源字段类型"
      >
        <Select v-model:value="field.sourceType" :options="sourceTypes" />
      </FormItem>
      <FormItem
        :name="['fields', index, 'key']"
        :rules="keyRules"
        label="返回字段"
      >
        <Input v-model:value="field.key" placeholder="返回字段" />
      </FormItem>
      <FormItem
        :name="['fields', index, 'type']"
        :rules="requiredRules"
        label="返回类型"
      >
        <Select v-model:value="field.type" :options="valueTypes" />
      </FormItem>
      <FormItem
        :name="['fields', index, 'label']"
        :rules="labelRules"
        label="字段描述"
      >
        <Input v-model:value="field.label" placeholder="字段描述" />
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
    minmax(120px, 1fr) minmax(100px, 0.8fr) minmax(120px, 1fr)
    minmax(120px, 0.9fr) minmax(120px, 1.1fr) 32px;
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

  .dc-mapping-row :deep(.ant-form-item:nth-of-type(5)) {
    grid-column: 1;
  }

  .dc-remove-field {
    justify-self: end;
  }
}
</style>
