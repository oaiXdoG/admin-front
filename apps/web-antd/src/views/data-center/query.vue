<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { DataTemplate } from './types';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { DataParam, DataQueryResult, DataSourceZone } from '#/api/types';

import { computed, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Alert,
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
import {
  exportDataApi,
  getDataTemplatesApi,
  getSourceZonesApi,
  queryDataApi,
} from '#/api';
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

/** 模板的数据源是否按区自动发现；是的话要选区服 */
const zoneMode = ref(false);
const zones = ref<DataSourceZone[]>([]);
const zonesLoading = ref(false);
const zoneIds = ref<number[]>([]);
/** 点击查询时固定下来的区服，翻页、导出时沿用 */
const submittedZones = ref<number[]>([]);
/** 查询失败或已离线的区，不影响其他区的结果 */
const failures = ref<DataQueryResult['failures']>([]);
/** 切换模板时丢弃上一个模板晚到的区服列表 */
let zonesToken = 0;

/** 结果里的区服列，避开模板字段名 */
const ZONE_COLUMN = '__zone';

const template = computed(() =>
  templates.value.find((item) => item.id === templateId.value),
);
const zoneOptions = computed(() =>
  zones.value.map((zone) => ({ label: `${zone.zoneId} 区`, value: zone.zoneId })),
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
            submittedZones.value,
          );
          rawRows = result.list;
          failures.value = result.failures ?? [];
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
  const result = flattenFields(template.value?.fields ?? [], (field) =>
    readDotPath(row, field.source),
  );
  if (zoneMode.value) {
    result[ZONE_COLUMN] =
      row._zone === undefined || row._zone === null ? '' : `${row._zone} 区`;
  }
  return result;
}

/** 切换模板：重建参数表单和结果列，清空结果 */
/** 结果列加上固定在右侧的「详情」，只有点它才打开详情，点表格其他地方可以正常选中、复制文字 */
function resultColumns(fields: Parameters<typeof mappedColumns>[0]) {
  const zoneColumns = zoneMode.value
    ? [{ field: ZONE_COLUMN, fixed: 'left' as const, title: '区服', width: 90 }]
    : [];
  return [
    ...zoneColumns,
    ...mappedColumns(fields),
    { field: 'operation', fixed: 'right' as const, slots: { default: 'detail' }, title: '操作', width: 72 },
  ];
}

/**
 * 读取模板数据源的区服：zone 类型默认选第一个区；http 类型返回空列表。
 * 模板列表没带数据源类型时，有区服即按区查询
 */
async function loadZones(sourceId: number, sourceType?: string) {
  const token = ++zonesToken;
  zones.value = [];
  zoneIds.value = [];
  zoneMode.value = sourceType === 'zone';
  if (sourceType === 'http') return;
  zonesLoading.value = true;
  try {
    const { list } = await getSourceZonesApi(projectId.value, sourceId);
    if (token !== zonesToken) return;
    zones.value = list;
    zoneMode.value = sourceType === 'zone' || list.length > 0;
    zoneIds.value = list[0] ? [list[0].zoneId] : [];
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    if (token === zonesToken) zonesLoading.value = false;
  }
}

function selectAllZones() {
  zoneIds.value = zones.value.map((zone) => zone.zoneId);
}

async function onTemplateChange() {
  submitted.value = undefined;
  submittedZones.value = [];
  failures.value = [];
  rawRows = [];
  const current = template.value;
  formApi.setState({ schema: (current?.params ?? []).map(paramSchema) });
  await formApi.reset();
  if (current) {
    await loadZones(current.sourceId, current.sourceType);
  } else {
    zonesToken++;
    zoneMode.value = false;
    zones.value = [];
    zoneIds.value = [];
  }
  // 切换期间又选了别的模板，交给后一次处理
  if (template.value !== current) return;
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
  if (zoneMode.value && zoneIds.value.length === 0) {
    message.warning('请选择区服');
    return;
  }
  const params = await paramValues();
  if (!params) return;
  submitted.value = params;
  submittedZones.value = zoneMode.value ? [...zoneIds.value] : [];
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
      submittedZones.value,
    );
    const columns = resultColumns(current.fields)
      .filter((column) => column.field !== 'operation')
      .map((column) => ({
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
    const failed = result.failures ?? [];
    if (failed.length > 0) {
      message.warning(
        `以下区导出失败：${failed.map((item) => `${item.zoneId} 区：${item.message}`).join('；')}`,
      );
    }
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
        <div
          :class="{ 'dc-template--hint': zoneMode && zoneIds.length > 1 }"
          class="dc-template"
        >
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
          <div v-if="zoneMode" class="dc-zone">
            <span class="dc-zone-label">区服</span>
            <Select
              v-model:value="zoneIds"
              :loading="zonesLoading"
              max-tag-count="responsive"
              :not-found-content="zonesLoading ? '加载中' : '没有在线的区'"
              :options="zoneOptions"
              class="dc-zone-select"
              mode="multiple"
              option-filter-prop="label"
              placeholder="请选择区服"
            />
            <Button
              :disabled="zones.length === 0"
              size="small"
              type="link"
              @click="selectAllZones"
            >
              全部
            </Button>
            <div v-if="zoneIds.length > 1" class="dc-zone-hint">
              多个区时每个区各取当前页，合并显示
            </div>
          </div>
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
      <div v-if="failures.length > 0">
        <Alert show-icon type="warning">
          <template #message>
            {{ failures.length }} 个区查询失败，结果中不包含这些区
          </template>
          <template #description>
            <div v-for="item in failures" :key="item.zoneId">
              {{ item.zoneId }} 区：{{ item.message }}
            </div>
          </template>
        </Alert>
      </div>
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
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.dc-template--hint {
  padding-bottom: 20px;
}

.dc-zone {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: center;
  max-width: 100%;
}

.dc-zone-label {
  flex-shrink: 0;
  margin-left: 12px;
  font-size: 14px;
}

.dc-zone-select {
  width: 280px;
  max-width: 100%;
}

/* 放在区服下拉框下面，不撑高这一行 */
.dc-zone-hint {
  position: absolute;
  top: calc(100% + 2px);
  left: 52px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
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
