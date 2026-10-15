<script lang="ts" setup>
import type { TreeProps } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

import type { JsonConfig, JsonMapping, SampleTree } from './types';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Checkbox,
  FormItem,
  Input,
  message,
  Select,
  Tag,
  Textarea,
  Tooltip,
  Tree,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { displaySample, inspectSample, useRowKey, valueTypes } from './types';

defineProps<{ index: number }>();

const json = defineModel<JsonConfig>('json', { required: true });

const rowKey = useRowKey();
const pathRules: Rule[] = [
  { message: '请输入 JSON 路径', required: true, whitespace: true },
];
const labelRules: Rule[] = [
  { message: '请输入展示名称', required: true, whitespace: true },
];
const requiredRules: Rule[] = [{ required: true }];
function initialTree(): null | SampleTree {
  try {
    return json.value.sample
      ? inspectSample(JSON.parse(json.value.sample))
      : null;
  } catch {
    return null;
  }
}

const sampleTree = ref<null | SampleTree>(initialTree());

const mappings = computed(() => json.value.mappings ?? []);
const checkedKeys = computed(() => mappings.value.map((item) => item.path));
const showPreview = computed(
  () =>
    !!sampleTree.value && json.value.showMapped && mappings.value.length > 0,
);

function typeLabel(key: unknown) {
  const type = sampleTree.value?.values.get(String(key))?.type;
  return valueTypes.find((item) => item.value === type)?.label;
}

function sampleValue(item: JsonMapping) {
  const node = sampleTree.value?.values.get(item.path);
  return node ? displaySample(node.value, item.type) : '-';
}

const [PreviewGrid, previewGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { align: 'left', field: 'label', title: '展示名称', width: 160 },
      { align: 'left', field: 'sample', minWidth: 160, title: '示例值' },
    ],
    data: [],
    pagerConfig: { enabled: false },
    rowConfig: { keyField: 'path' },
  } as VxeTableGridOptions,
});

watch(
  [mappings, sampleTree],
  () =>
    previewGridApi.setGridOptions({
      data: mappings.value.map((item) => ({
        ...item,
        sample: sampleValue(item),
      })),
    }),
  { deep: true, immediate: true },
);

function parse() {
  try {
    const parsed: unknown = JSON.parse(json.value.sample ?? '');
    if (parsed === null || typeof parsed !== 'object')
      throw new Error('invalid');
    sampleTree.value = inspectSample(parsed);
  } catch {
    sampleTree.value = null;
    message.error('请输入有效的 JSON 对象或数组');
  }
}

const onCheck: TreeProps['onCheck'] = (keys) => {
  const tree = sampleTree.value;
  if (!tree) return;
  const checked = (Array.isArray(keys) ? keys : keys.checked).map(String);
  const next = mappings.value.filter(
    (item) => !tree.values.has(item.path) || checked.includes(item.path),
  );
  for (const key of checked) {
    const node = tree.values.get(key);
    if (node && !next.some((item) => item.path === key)) {
      next.push({ label: node.label, path: node.path, type: node.type });
    }
  }
  json.value.mappings = next;
};

function addMapping() {
  json.value.mappings ??= [];
  json.value.mappings.push({ label: '', path: '', type: 'string' });
}

function removeMapping(index: number) {
  json.value.mappings.splice(index, 1);
}
</script>

<template>
  <div class="dc-json-config">
    <div class="dc-json-options">
      <Checkbox v-model:checked="json.showRaw">展示原始 JSON</Checkbox>
      <Checkbox v-model:checked="json.showMapped">展示映射字段</Checkbox>
    </div>
    <div class="dc-json-sample">
      <FormItem :name="['fields', index, 'json', 'sample']" label="JSON 示例">
        <Textarea
          v-model:value="json.sample"
          :rows="3"
          placeholder="粘贴 JSON 对象或数组"
          @change="sampleTree = null"
        />
      </FormItem>
      <Button @click="parse">解析示例</Button>
    </div>
    <div v-if="sampleTree" class="dc-json-tree">
      <Tree
        :key="json.sample"
        :checked-keys="checkedKeys"
        :tree-data="sampleTree.nodes"
        checkable
        check-strictly
        default-expand-all
        @check="onCheck"
      >
        <template #title="{ key, title }">
          <span class="dc-tree-title">
            <span>{{ title }}</span>
            <Tag>{{ typeLabel(key) }}</Tag>
          </span>
        </template>
      </Tree>
    </div>
    <div class="dc-field-heading">
      <span>JSON 路径</span>
      <span>展示名称</span>
      <span>展示类型</span>
      <span></span>
    </div>
    <div
      v-for="(mapping, mappingIndex) in mappings"
      :key="rowKey(mapping)"
      class="dc-field-row"
    >
      <FormItem
        :name="['fields', index, 'json', 'mappings', mappingIndex, 'path']"
        :rules="pathRules"
      >
        <Input
          v-model:value="mapping.path"
          aria-label="JSON 路径"
          placeholder="$.profile.nickname"
        />
      </FormItem>
      <FormItem
        :name="['fields', index, 'json', 'mappings', mappingIndex, 'label']"
        :rules="labelRules"
      >
        <Input
          v-model:value="mapping.label"
          aria-label="映射展示名称"
          placeholder="展示名称"
        />
      </FormItem>
      <FormItem
        :name="['fields', index, 'json', 'mappings', mappingIndex, 'type']"
        :rules="requiredRules"
      >
        <Select
          v-model:value="mapping.type"
          :options="valueTypes"
          aria-label="映射展示类型"
        />
      </FormItem>
      <Tooltip title="移除映射">
        <Button aria-label="移除映射" @click="removeMapping(mappingIndex)">
          <template #icon>
            <IconifyIcon class="size-4" icon="lucide:trash-2" />
          </template>
        </Button>
      </Tooltip>
    </div>
    <div v-if="!mappings.length" class="dc-mapping-empty">暂无子字段映射</div>
    <Button @click="addMapping">
      <template #icon>
        <IconifyIcon class="size-4" icon="lucide:plus" />
      </template>
      添加子字段映射
    </Button>
    <div v-if="showPreview" class="dc-json-preview">
      <h4>映射预览</h4>
      <PreviewGrid />
    </div>
  </div>
</template>

<style scoped>
.dc-json-config {
  padding: 18px 0 0 18px;
  margin-top: 16px;
  border-left: 2px solid hsl(var(--primary) / 30%);
}

.dc-json-options {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  margin-bottom: 16px;
}

.dc-json-sample :deep(.ant-form-item) {
  margin-bottom: 10px;
}

.dc-json-tree {
  max-height: 260px;
  padding-block: 10px;
  margin: 16px 0;
  overflow: auto;
  border-block: 1px solid hsl(var(--border));
}

.dc-tree-title {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.dc-field-heading,
.dc-field-row {
  display: grid;
  grid-template-columns:
    minmax(120px, 1fr) minmax(120px, 1fr) minmax(120px, 0.8fr)
    32px;
  gap: 12px;
}

.dc-field-heading {
  padding: 0 0 12px;
  margin-top: 18px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.dc-field-row :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.dc-mapping-empty {
  padding: 12px 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.dc-json-preview {
  margin-top: 18px;
}

.dc-json-preview h4 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
}

.dc-json-preview :deep(.ant-table-cell) {
  overflow-wrap: anywhere;
}

@media (max-width: 767px) {
  .dc-json-config {
    padding-left: 10px;
  }

  .dc-field-heading {
    display: none;
  }

  .dc-field-row {
    grid-template-columns: minmax(0, 1fr) 32px;
    padding-bottom: 4px;
    margin-bottom: 12px;
    border-bottom: 1px solid hsl(var(--border));
  }

  .dc-field-row :deep(.ant-form-item) {
    grid-column: 1;
  }

  .dc-field-row > :deep(.ant-btn) {
    grid-row: 1;
    grid-column: 2;
  }
}
</style>
