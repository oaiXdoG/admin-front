import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { z } from '#/adapter/form';
import { registeredRoutes } from '#/router/registry';

export const MENU_TYPE_DIRECTORY = 1;

export function useFormSchema(isEdit: boolean): VbenFormSchema[] {
  return [
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        disabled: isEdit,
        max: Number.MAX_SAFE_INTEGER,
        min: 1,
        placeholder: '请输入菜单 ID',
        precision: 0,
      },
      fieldName: 'menuId',
      label: '菜单 ID',
      rules: z
        .number({ message: '请输入菜单 ID' })
        .int()
        .positive({ message: '菜单 ID 必须为安全范围内的正整数' })
        .max(Number.MAX_SAFE_INTEGER, {
          message: '菜单 ID 必须为安全范围内的正整数',
        }),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: registeredRoutes.map((item) => ({
          label: `${item.title}  ${item.name}  ${item.path}`,
          value: item.name,
        })),
        placeholder: '选择后填入路由名称和路径',
      },
      fieldName: 'registeredRoute',
      label: '已注册路由',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '目录', value: 1 },
          { label: '菜单', value: 2 },
        ],
      },
      defaultValue: 2,
      fieldName: 'menuType',
      label: '类型',
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64, placeholder: '请输入名称' },
      fieldName: 'name',
      label: '名称',
      rules: z
        .string()
        .trim()
        .min(1, { message: '请输入名称' })
        .max(64, { message: '名称最长 64 位' }),
    },
    {
      component: 'IconPicker',
      componentProps: { placeholder: '可空，例如 lucide:users' },
      fieldName: 'icon',
      label: '图标',
      rules: z.string().max(64, { message: '图标最长 64 位' }).optional(),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64, placeholder: '可空' },
      fieldName: 'routeName',
      label: '路由名称',
      rules: z.string().max(64, { message: '路由名称最长 64 位' }).optional(),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128, placeholder: '可空' },
      fieldName: 'routePath',
      label: '路由路径',
      rules: z.string().max(128, { message: '路由路径最长 128 位' }).optional(),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '启用', value: 1 },
          { label: '停用', value: 2 },
        ],
      },
      defaultValue: 1,
      fieldName: 'status',
      label: '状态',
      rules: 'selectRequired',
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'hidden',
      label: '隐藏',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 0 },
      defaultValue: 0,
      fieldName: 'sort',
      label: '排序',
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '请输入菜单名称、路由名称或路径',
      },
      fieldName: 'keyword',
      label: '菜单名称',
    },
  ];
}

export function useColumns(): VxeTableGridColumns {
  return [
    {
      align: 'left',
      field: 'name',
      fixed: 'left',
      minWidth: 220,
      slots: { default: 'name' },
      title: '菜单名称',
      treeNode: true,
    },
    { field: 'id', title: '菜单 ID', width: 100 },
    {
      field: 'menuType',
      formatter: ({ cellValue }) =>
        cellValue === MENU_TYPE_DIRECTORY ? '目录' : '菜单',
      title: '类型',
      width: 90,
    },
    { field: 'routeName', minWidth: 160, title: '路由名称' },
    { field: 'routePath', minWidth: 180, title: '路由路径' },
    {
      field: 'status',
      slots: { default: 'status' },
      title: '状态',
      width: 90,
    },
    {
      field: 'hidden',
      formatter: ({ cellValue }) => (cellValue ? '是' : '否'),
      title: '隐藏',
      width: 80,
    },
    { field: 'sort', title: '排序', width: 80 },
    {
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 220,
    },
  ];
}
