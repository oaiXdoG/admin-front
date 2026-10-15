<script lang="ts" setup>
import type { DataParam } from '#/api/types';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Checkbox,
  Empty,
  Input,
  Select,
  Tooltip,
} from 'ant-design-vue';

/** 查询参数定义：使用者在数据查询页面按这里的定义填写参数 */
const params = defineModel<DataParam[]>({ required: true });

const typeOptions = [
  { label: '文本', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '是/否', value: 'boolean' },
  { label: '日期时间', value: 'time' },
  { label: '下拉选择', value: 'select' },
];

function add() {
  params.value.push({ label: '', name: '', required: false, type: 'string' });
}

function remove(index: number) {
  params.value.splice(index, 1);
}

/** 下拉选项用「值=显示名」每行一个，显示名可省略 */
function optionsText(param: DataParam) {
  return (param.options ?? [])
    .map((item) =>
      item.label && item.label !== item.value
        ? `${item.value}=${item.label}`
        : item.value,
    )
    .join('\n');
}

function setOptions(param: DataParam, text: string) {
  param.options = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value = '', ...rest] = line.split('=');
      return {
        label: rest.join('=').trim() || value.trim(),
        value: value.trim(),
      };
    });
}
</script>

<template>
  <div>
    <div v-if="params.length > 0" class="dc-param-head">
      <span>参数名</span>
      <span>显示名</span>
      <span>类型</span>
      <span>必填</span>
      <span></span>
    </div>
    <div v-for="(param, index) in params" :key="index" class="dc-param">
      <div class="dc-param-row">
        <Input
          v-model:value="param.name"
          :status="/^[A-Z_]\w{0,63}$/i.test(param.name) ? '' : 'error'"
          placeholder="例如 playerId"
        />
        <Input v-model:value="param.label" placeholder="例如 玩家 ID" />
        <Select v-model:value="param.type" :options="typeOptions" />
        <Checkbox v-model:checked="param.required" />
        <Tooltip title="移除参数">
          <Button @click="remove(index)">
            <template #icon>
              <IconifyIcon class="size-4" icon="lucide:trash-2" />
            </template>
          </Button>
        </Tooltip>
      </div>
      <div v-if="param.type === 'select'" class="dc-param-options">
        <Input.TextArea
          :auto-size="{ minRows: 2, maxRows: 6 }"
          :value="optionsText(param)"
          placeholder="每行一个选项，格式：值=显示名，例如 1=一区"
          @update:value="(text: string) => setOptions(param, text)"
        />
      </div>
    </div>
    <Empty
      v-if="params.length === 0"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
      description="没有参数（查询不需要使用者填写条件）"
    />
    <Button @click="add">
      <template #icon>
        <IconifyIcon class="size-4" icon="lucide:plus" />
      </template>
      添加参数
    </Button>
  </div>
</template>

<style scoped>
.dc-param-head,
.dc-param-row {
  display: grid;
  grid-template-columns:
    minmax(140px, 1fr) minmax(140px, 1fr) minmax(120px, 0.8fr)
    48px 32px;
  gap: 12px;
  align-items: center;
}

.dc-param-head {
  margin-bottom: 8px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.dc-param {
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.dc-param-options {
  margin-top: 8px;
}
</style>
