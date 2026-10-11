import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { z } from '#/adapter/form';

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
      label: '密码',
      rules: z
        .string()
        .min(1, { message: '请输入密码' })
        .max(128, { message: '密码最长 128 位' }),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'username',
      label: '显示名',
      rules: usernameRule,
    },
  ];
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
      help: '留空不修改密码',
      label: '新密码',
      rules: z
        .string()
        .max(128, { message: '密码最长 128 位' })
        .refine((value) => !value || value.trim().length > 0, {
          message: '密码不能仅包含空格',
        })
        .optional(),
    },
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
  ];
}

export function useColumns(): VxeTableGridColumns {
  return [
    { type: 'checkbox', width: 60 },
    { field: 'id', title: '用户 ID', width: 120 },
    { align: 'left', field: 'account', title: '登录名', width: 240 },
    { align: 'left', field: 'username', minWidth: 160, title: '显示名' },
    {
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 200,
    },
  ];
}
