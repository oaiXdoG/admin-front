<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { DataTemplate } from './types';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { DataParam } from '#/api/types';

import { computed, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Drawer,
  Empty,
  message,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { exportDataApi, getDataTemplatesApi, queryDataApi } from '#/api';
import {
  downloadCsv,
  flattenFields,
  mappedColumns,
  readDotPath,
} from '#/components/field-mapping/types';
import { useProjectStore } from '#/store';

import { parseDataTemplate } from './types';

const projectStore = useProjectStore();
const { hasAccessByCodes } = useAccess();
const projectId = computed(() => projectStore.currentProjectId as number);

const templates = ref<DataTemplate[]>([]);
const templateId = ref<number>();
/** 点击查询时固定下来的参数，翻页时沿用 */
const submitted = ref<Record<string, unknown>>();
const detail = ref<null | Record<string, unknown>>(null);
const exporting = ref(false);
let rawRows: Record<string, unknown>[] = [];

const template = computed(() =>
  templates.value.find((item) => item.id === templateId.value),
);
const templateOptions = computed(() =>
  templates.value.map((item) => ({
    label: `${item.name}（${item.sourceName ?? ''}）`,
    value: item.id,
  })),
);

/** 按参数定义生成表单项 */
function paramSchema(param: DataParam): VbenFormSchema {
  const base = {
    fieldName: param.name,
    label: param.label,
    rules: param.required ? 'required' : undefined,
  };
  switch (param.type) {
    case 'boolean': {
      return {
        ...base,
        component: 'Select',
        componentProps: {
          allowClear: !param.required,
          options: [
            { label: '是', value: 'true' },
            { label: '否', value: 'false' },
          ],
          placeholder: '请选择',
        },
        rules: param.required ? 'selectRequired' : undefined,
      };
    }
    case 'number': {
      return {
        ...base,
        component: 'InputNumber',
        componentProps: { class: 'w-full', placeholder: '请输入数字' },
      };
    }
    case 'select': {
      return {
        ...base,
        component: 'Select',
        componentProps: {
          allowClear: !param.required,
          options: param.options ?? [],
          placeholder: '请选择',
        },
        rules: param.required ? 'selectRequired' : undefined,
      };
    }
    case 'time': {
      return {
        ...base,
        component: 'DatePicker',
        componentProps: { class: 'w-full', showTime: true },
      };
    }
    default: {
      return {
        ...base,
        component: 'Input',
        componentProps: { allowClear: true, placeholder: '请输入' },
      };
    }
  }
}

const [ParamForm, formApi] = useVbenForm({
  schema: [],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [],
    height: 'auto',
    pagerConfig: { pageSize: 20, pageSizes: [20, 50, 100, 200] },
    proxyConfig: {
      autoLoad: false,
      ajax: {
        query: async ({ page }) => {
          const current = template.value;
          if (!current || !submitted.value) return { items: [], total: 0 };
          const result = await queryDataApi(
            projectId.value,
            current.id,
            submitted.value,
            page.currentPage,
            page.pageSize,
          );
          rawRows = result.list;
          return {
            items: result.list.map((row) => toTableRow(row)),
            total: result.total,
          };
        },
      },
    },
    rowConfig: { isHover: true },
    toolbarConfig: { custom: true, zoom: true },
  } as VxeTableGridOptions,
});

function toTableRow(row: Record<string, unknown>) {
  return flattenFields(template.value?.fields ?? [], (field) =>
    readDotPath(row, field.source),
  );
}

/** 切换模板：重建参数表单和结果列，清空结果 */
/** 结果列加上固定在右侧的「详情」，只有点它才打开详情，点表格其他地方可以正常选中、复制文字 */
function resultColumns(fields: Parameters<typeof mappedColumns>[0]) {
  return [
    ...mappedColumns(fields),
    { field: 'operation', fixed: 'right' as const, slots: { default: 'detail' }, title: '操作', width: 72 },
  ];
}

async function onTemplateChange() {
  submitted.value = undefined;
  rawRows = [];
  const current = template.value;
  formApi.setState({ schema: (current?.params ?? []).map(paramSchema) });
  await formApi.reset();
  gridApi.setGridOptions({
    columns: resultColumns(current?.fields ?? []),
    data: [],
  });
}

/** 表单值转成提交给后端的参数：日期为毫秒，空值不传 */
async function paramValues() {
  const { valid } = await formApi.validate();
  if (!valid) return null;
  const values = await formApi.getValues<Record<string, unknown>>();
  const result: Record<string, unknown> = {};
  for (const param of template.value?.params ?? []) {
    const value = values[param.name];
    if (value === undefined || value === null || value === '') continue;
    result[param.name] =
      param.type === 'time' ? (value as Dayjs).valueOf() : value;
  }
  return result;
}

async function search() {
  if (!template.value) {
    message.warning('请选择查询模板');
    return;
  }
  const params = await paramValues();
  if (!params) return;
  submitted.value = params;
  await gridApi.query();
}

async function exportCsv() {
  const current = template.value;
  if (!current || !submitted.value) return;
  exporting.value = true;
  try {
    const result = await exportDataApi(
      projectId.value,
      current.id,
      submitted.value,
    );
    const columns = mappedColumns(current.fields).map((column) => ({
      title: column.title,
      value: (row: Record<string, string>) => row[column.field],
    }));
    downloadCsv(
      `${current.name}-${dayjs().format('YYYYMMDD-HHmmss')}.csv`,
      columns,
      result.list.map((row) => toTableRow(row)),
    );
    message.success(
      result.list.length >= 50_000
        ? '已导出前 5 万行'
        : `已导出 ${result.list.length} 行`,
    );
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    exporting.value = false;
  }
}

onMounted(async () => {
  const { list } = await getDataTemplatesApi(projectId.value);
  templates.value = list.map(parseDataTemplate);
});
</script>

<template>
  <Page auto-content-height>
    <div class="dc-page">
      <section class="dc-panel">
        <div class="dc-template">
          <span class="dc-label">查询模板</span>
          <Select
            v-model:value="templateId"
            :options="templateOptions"
            class="dc-select"
            placeholder="请选择查询模板"
            show-search
            option-filter-prop="label"
            @change="onTemplateChange"
          />
          <Tag v-if="template" color="blue">{{ template.query }}</Tag>
        </div>
        <template v-if="template">
          <div v-if="template.params.length > 0" class="mt-4">
            <ParamForm />
          </div>
          <div class="dc-actions">
            <Space>
              <Button @click="formApi.reset()">重置</Button>
              <Button type="primary" @click="search">
                <template #icon>
                  <IconifyIcon class="size-4" icon="lucide:search" />
                </template>
                查询
              </Button>
            </Space>
          </div>
        </template>
      </section>
      <div class="dc-result">
        <Grid table-title="查询结果">
          <template #toolbar-tools>
            <Button
              v-if="hasAccessByCodes(['data_query:export'])"
              :disabled="!submitted"
              :loading="exporting"
              @click="exportCsv"
            >
              <template #icon>
                <IconifyIcon class="size-4" icon="lucide:download" />
              </template>
              导出
            </Button>
          </template>
          <template #detail="{ rowIndex }">
            <Button size="small" type="link" @click="detail = rawRows[rowIndex] ?? null">
              详情
            </Button>
          </template>
          <template #empty>
            <Empty
              :description="template ? '暂无结果' : '请选择查询模板'"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />
          </template>
        </Grid>
      </div>
    </div>
    <Drawer
      :open="!!detail"
      :width="560"
      title="数据详情"
      @close="detail = null"
    >
      <pre class="dc-json">{{ JSON.stringify(detail, null, 2) }}</pre>
    </Drawer>
  </Page>
</template>

<style scoped>
.dc-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.dc-panel {
  padding: 20px 24px;
  background: hsl(var(--card));
  border-radius: 8px;
}

.dc-template {
  display: flex;
  gap: 12px;
  align-items: center;
}

.dc-label {
  flex-shrink: 0;
  width: 88px;
  font-size: 14px;
}

.dc-select {
  width: 360px;
  max-width: 100%;
}

.dc-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px solid hsl(var(--border));
}

.dc-result {
  flex: 1;
  min-height: 320px;
}

.dc-json {
  padding: 12px;
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  background: hsl(var(--muted));
  border-radius: 6px;
}
</style>
