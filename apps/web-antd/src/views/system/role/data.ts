import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { RoleKind } from '#/api';

import dayjs from 'dayjs';

import { z } from '#/adapter/form';

export const STATUS_OPTIONS = [
  { label: '启用', value: 1 },
  { label: '停用', value: 2 },
];

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { maxlength: 32 },
      fieldName: 'name',
      label: '角色名称',
      rules: z
        .string()
        .trim()
        .min(1, { message: '请输入角色名称' })
        .max(32, { message: '角色名称最长 32 位' }),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'code',
      help: '大写字母开头，只能包含大写字母、数字和下划线，例如 OPERATOR',
      label: '角色编码',
      rules: z
        .string()
        .trim()
        .min(1, { message: '请输入角色编码' })
        .max(64, { message: '角色编码最长 64 位' })
        .regex(/^[A-Z][A-Z0-9_]*$/, {
          message: '只能使用大写字母、数字和下划线，并以字母开头',
        }),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 128, rows: 3 },
      defaultValue: '',
      fieldName: 'description',
      label: '角色描述',
      rules: z.string().max(128, { message: '角色描述最长 128 位' }).optional(),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: STATUS_OPTIONS,
      },
      defaultValue: 1,
      fieldName: 'status',
      label: '角色状态',
      rules: 'selectRequired',
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入角色名称' },
      fieldName: 'keyword',
      label: '角色名称',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: STATUS_OPTIONS,
        placeholder: '请选择角色状态',
      },
      fieldName: 'status',
      label: '角色状态',
    },
  ];
}

export function useColumns(kind: RoleKind): VxeTableGridColumns {
  return [
    { type: 'checkbox', width: 60 },
    { field: 'id', title: '角色 ID', width: 100 },
    { field: 'name', minWidth: 140, title: '角色名称' },
    { align: 'left', field: 'code', minWidth: 140, title: '角色编码' },
    { align: 'left', field: 'description', minWidth: 180, title: '角色描述' },
    ...(kind === 'project'
      ? [
          {
            field: 'templateName',
            formatter: ({ cellValue }: { cellValue?: string }) =>
              cellValue || '—',
            title: '来源模板',
            width: 120,
          },
        ]
      : []),
    {
      field: 'status',
      slots: { default: 'status' },
      title: '状态',
      width: 110,
    },
    {
      field: 'createdAt',
      formatter: ({ cellValue }) =>
        cellValue ? dayjs(cellValue).format('YYYY-MM-DD HH:mm') : '—',
      title: '创建时间',
      width: 160,
    },
    {
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 240,
    },
  ];
}
