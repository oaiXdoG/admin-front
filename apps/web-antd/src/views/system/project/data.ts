import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { h } from 'vue';

import { Button } from 'ant-design-vue';
import dayjs from 'dayjs';

import { z } from '#/adapter/form';

const APP_KEY_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** 生成 32 位随机 App Key */
export function generateAppKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => APP_KEY_CHARS[byte % 62]).join('');
}

/**
 * @param onGenerate 点击「随机生成」时调用，由使用方把生成的值写回表单
 */
export function useProjectFormSchema(onGenerate: () => void): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { maxlength: 64, placeholder: '请输入 App Key' },
      fieldName: 'appKey',
      renderComponentContent: () => ({
        addonAfter: () =>
          h(
            Button,
            { size: 'small', type: 'link', onClick: onGenerate },
            () => '随机生成',
          ),
      }),
      label: 'App Key',
      rules: z
        .string()
        .trim()
        .min(1, { message: '请输入 App Key' })
        .max(64, { message: 'App Key 最长 64 位' }),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64, placeholder: '请输入项目名称' },
      fieldName: 'name',
      label: '项目名称',
      rules: z
        .string()
        .trim()
        .min(1, { message: '请输入项目名称' })
        .max(64, { message: '项目名称最长 64 位' }),
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '项目名称' },
      fieldName: 'name',
      label: '项目名称',
    },
  ];
}

export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'projectId', title: '项目 ID', width: 120 },
    { field: 'appKey', minWidth: 160, title: 'App Key' },
    { field: 'name', minWidth: 160, title: '项目名称' },
    {
      field: 'createdAt',
      formatter: ({ cellValue }) =>
        cellValue === null || cellValue === undefined
          ? '—'
          : dayjs(cellValue).format('YYYY-MM-DD HH:mm:ss'),
      title: '创建时间',
      width: 200,
    },
    {
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 150,
    },
  ];
}
