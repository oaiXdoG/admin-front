import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import dayjs from 'dayjs';

import { z } from '#/adapter/form';
import { STATUS_DISABLED, STATUS_ENABLED } from '#/api/types';
import {
  optionalPasswordRule,
  PASSWORD_HELP,
  passwordRule,
} from '#/utils/password';

const usernameRule = z
  .string()
  .trim()
  .min(1, { message: '请输入显示名' })
  .max(64, { message: '显示名最长 64 位' });

export function useCreateFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { autocomplete: 'off', maxlength: 64 },
      fieldName: 'account',
      label: '登录名',
      rules: z
        .string()
        .trim()
        .min(1, { message: '请输入登录名' })
        .max(64, { message: '登录名最长 64 位' }),
    },
    {
      component: 'InputPassword',
      componentProps: { autocomplete: 'new-password', maxlength: 128 },
      fieldName: 'password',
      help: PASSWORD_HELP,
      label: '密码',
      rules: passwordRule,
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'username',
      label: '显示名',
      rules: usernameRule,
    },
    remarkField(),
  ];
}

function remarkField(): VbenFormSchema {
  return {
    component: 'Input',
    componentProps: { maxlength: 128, placeholder: '可空，例如所属部门' },
    defaultValue: '',
    fieldName: 'remark',
    label: '备注',
    rules: z.string().max(128, { message: '备注最长 128 位' }).optional(),
  };
}

export function useEditFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'username',
      label: '显示名',
      rules: usernameRule,
    },
    {
      component: 'InputPassword',
      componentProps: { autocomplete: 'new-password', maxlength: 128 },
      fieldName: 'password',
      help: `留空不修改；${PASSWORD_HELP}；重置后该账号已登录的会话会失效`,
      label: '重置密码',
      rules: optionalPasswordRule,
    },
    remarkField(),
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入账号或显示名' },
      fieldName: 'keyword',
      label: '账号/显示名',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '启用', value: STATUS_ENABLED },
          { label: '禁用', value: STATUS_DISABLED },
        ],
        placeholder: '全部',
      },
      fieldName: 'status',
      label: '状态',
    },
  ];
}

const formatTime = ({ cellValue }: { cellValue?: number }) =>
  cellValue ? dayjs(cellValue).format('YYYY-MM-DD HH:mm') : '—';

export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'id', title: '用户 ID', width: 90 },
    { align: 'left', field: 'account', minWidth: 140, title: '登录名' },
    { align: 'left', field: 'username', minWidth: 120, title: '显示名' },
    {
      field: 'platformRoles',
      minWidth: 160,
      slots: { default: 'platformRoles' },
      title: '平台角色',
    },
    { field: 'projectCount', title: '项目数', width: 80 },
    { align: 'left', field: 'remark', minWidth: 120, title: '备注' },
    {
      field: 'status',
      slots: { default: 'status' },
      title: '状态',
      width: 100,
    },
    {
      field: 'lastLoginAt',
      formatter: formatTime,
      title: '最后登录',
      width: 150,
    },
    {
      field: 'createdAt',
      formatter: formatTime,
      title: '创建时间',
      width: 150,
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
