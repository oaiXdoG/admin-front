import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { h } from 'vue';

import { Button } from 'ant-design-vue';
import dayjs from 'dayjs';

import { z } from '#/adapter/form';
import { getProjectTemplateOptionsApi } from '#/api';
import { STATUS_DISABLED, STATUS_ENABLED } from '#/api/types';

const APP_KEY_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** 生成 32 位随机 App Key */
export function generateAppKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => APP_KEY_CHARS[byte % 62]).join('');
}

/**
 * @param onGenerate 点击「随机生成」时调用，由使用方把生成的值写回表单；为 null 时是编辑，App Key 只读
 * @param withTemplates 新建项目时显示「初始角色模板」
 */
export function useProjectFormSchema(
  onGenerate: (() => void) | null,
  withTemplates = false,
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        disabled: !onGenerate,
        maxlength: 64,
        placeholder: '请输入 App Key',
      },
      fieldName: 'appKey',
      help: '日志按 App Key 区分项目，创建后不能修改',
      renderComponentContent: () =>
        onGenerate
          ? {
              addonAfter: () =>
                h(
                  Button,
                  { size: 'small', type: 'link', onClick: onGenerate },
                  () => '随机生成',
                ),
            }
          : {},
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
    {
      component: 'Textarea',
      componentProps: { maxlength: 128, placeholder: '可空', rows: 2 },
      defaultValue: '',
      fieldName: 'description',
      label: '项目描述',
      rules: z.string().max(128, { message: '项目描述最长 128 位' }).optional(),
    },
    ...(withTemplates
      ? [
          {
            component: 'ApiSelect',
            componentProps: {
              allowClear: true,
              api: getProjectTemplateOptionsApi,
              class: 'w-full',
              labelField: 'name',
              mode: 'multiple',
              placeholder: '选择后复制为本项目的角色，可不选',
              valueField: 'id',
            },
            defaultValue: [],
            fieldName: 'templateIds',
            help: '会自动生成「项目管理员」角色；勾选的模板连同菜单权限一起复制到新项目，之后可在项目里单独调整',
            label: '初始角色模板',
          } as VbenFormSchema,
        ]
      : []),
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '项目名称或 App Key' },
      fieldName: 'keyword',
      label: '项目',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '正常', value: STATUS_ENABLED },
          { label: '已关闭', value: STATUS_DISABLED },
        ],
        placeholder: '全部',
      },
      fieldName: 'status',
      label: '状态',
    },
  ];
}

const formatTime = ({ cellValue }: { cellValue?: number }) =>
  cellValue ? dayjs(cellValue).format('YYYY-MM-DD HH:mm:ss') : '—';

export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'projectId', title: '项目 ID', width: 90 },
    { align: 'left', field: 'name', minWidth: 140, title: '项目名称' },
    { align: 'left', field: 'appKey', minWidth: 180, title: 'App Key' },
    { align: 'left', field: 'description', minWidth: 160, title: '描述' },
    { field: 'memberCount', title: '成员数', width: 90 },
    {
      field: 'status',
      slots: { default: 'status' },
      title: '状态',
      width: 90,
    },
    {
      field: 'createdAt',
      formatter: formatTime,
      title: '创建时间',
      width: 170,
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
