<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { OperationLogRow } from '#/api/types';

import { Page } from '@vben/common-ui';

import { Tag, Tooltip } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getOperationLogsApi } from '#/api';

interface SearchValues {
  account?: string;
  action?: string;
  success?: 'false' | 'true';
  time?: [Dayjs, Dayjs];
}

/** 用 getter 让快捷选项在点击时才取当前时间 */
function preset(label: string, start: () => Dayjs) {
  return {
    label,
    get value() {
      return [start(), dayjs()];
    },
  };
}

function paramsText(row: OperationLogRow) {
  const params = row.params ?? {};
  return Object.keys(params).length > 0 ? JSON.stringify(params) : '';
}

const [Grid] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        component: 'RangePicker',
        componentProps: {
          allowClear: false,
          presets: [
            preset('最近 1 小时', () => dayjs().subtract(1, 'hour')),
            preset('今天', () => dayjs().startOf('day')),
            preset('最近 7 天', () => dayjs().subtract(7, 'day')),
            preset('最近 30 天', () => dayjs().subtract(30, 'day')),
          ],
          showTime: true,
        },
        defaultValue: [dayjs().subtract(7, 'day'), dayjs()],
        fieldName: 'time',
        formItemClass: 'col-span-2',
        label: '时间范围',
        rules: 'required',
      },
      {
        component: 'Input',
        componentProps: { allowClear: true, placeholder: '登录名，精确匹配' },
        fieldName: 'account',
        label: '操作人',
      },
      {
        component: 'Input',
        componentProps: { allowClear: true, placeholder: '例如 修改、删除' },
        fieldName: 'action',
        label: '操作',
      },
      {
        component: 'Select',
        componentProps: {
          allowClear: true,
          options: [
            { label: '成功', value: 'true' },
            { label: '失败', value: 'false' },
          ],
          placeholder: '全部',
        },
        fieldName: 'success',
        label: '结果',
      },
    ],
  },
  gridOptions: {
    columns: [
      {
        field: 'time',
        formatter: ({ cellValue }) =>
          dayjs(cellValue).format('YYYY-MM-DD HH:mm:ss'),
        title: '时间',
        width: 170,
      },
      {
        field: 'account',
        formatter: ({ cellValue }) => cellValue || '—',
        title: '操作人',
        width: 140,
      },
      { align: 'left', field: 'action', minWidth: 160, title: '操作' },
      {
        field: 'success',
        slots: { default: 'success' },
        title: '结果',
        width: 120,
      },
      {
        align: 'left',
        field: 'params',
        minWidth: 320,
        slots: { default: 'params' },
        title: '参数',
      },
      { field: 'route', minWidth: 200, title: '接口' },
    ],
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 20, pageSizes: [20, 50, 100, 200] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, values: SearchValues) => {
          const [start, end] = values.time ?? [];
          if (!start || !end) return { items: [], total: 0 };
          const result = await getOperationLogsApi({
            account: values.account?.trim() || undefined,
            action: values.action?.trim() || undefined,
            endTime: end.valueOf(),
            page: page.currentPage,
            pageSize: page.pageSize,
            startTime: start.valueOf(),
            success: values.success ? values.success === 'true' : undefined,
          });
          return { items: result.list, total: result.total };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<OperationLogRow>,
});
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="操作日志">
      <template #success="{ row }">
        <Tag :color="row.success ? 'success' : 'error'">
          {{ row.success ? '成功' : `失败 ${row.code}` }}
        </Tag>
      </template>
      <template #params="{ row }">
        <Tooltip :title="paramsText(row)" placement="topLeft">
          <span class="block truncate">{{ paramsText(row) || '—' }}</span>
        </Tooltip>
      </template>
    </Grid>
  </Page>
</template>
