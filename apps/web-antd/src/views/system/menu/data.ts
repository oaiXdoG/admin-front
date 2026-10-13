import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { MenuRecord } from '#/api/types';

import { z } from '#/adapter/form';
import { registeredRoutes } from '#/router/registry';

export const MENU_TYPE_DIRECTORY = 1;

export const MENU_TYPE_MENU = 2;

interface ParentNode {
  children: ParentNode[];
  title: string;
  value: number;
}

/**
 * 上级目录可选项：只有目录能做上级，编辑时排除自己和自己的下级，避免形成循环
 */
export function buildParentTree(menus: MenuRecord[], excludeId?: number) {
  const byParent = new Map<number, MenuRecord[]>();
  for (const menu of menus) {
    if (menu.menuType !== MENU_TYPE_DIRECTORY || menu.id === excludeId)
      continue;
    const list = byParent.get(menu.parentId || 0) ?? [];
    list.push(menu);
    byParent.set(menu.parentId || 0, list);
  }
  const build = (parentId: number): ParentNode[] =>
    (byParent.get(parentId) ?? [])
      .toSorted((a, b) => a.sort - b.sort || a.id - b.id)
      .map((menu) => ({
        children: build(menu.id),
        title: menu.name,
        value: menu.id,
      }));
  return [{ children: build(0), title: '顶级（无上级）', value: 0 }];
}

export function useFormSchema(
  isEdit: boolean,
  parentTree: ParentNode[],
): VbenFormSchema[] {
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
      help: isEdit ? undefined : '默认填入当前最大 ID + 1，可修改',
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
      component: 'TreeSelect',
      componentProps: {
        class: 'w-full',
        showSearch: true,
        treeData: parentTree,
        treeDefaultExpandAll: true,
        treeNodeFilterProp: 'title',
      },
      defaultValue: 0,
      fieldName: 'parentId',
      label: '上级目录',
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '目录', value: MENU_TYPE_DIRECTORY },
          { label: '菜单', value: MENU_TYPE_MENU },
        ],
      },
      defaultValue: MENU_TYPE_MENU,
      fieldName: 'menuType',
      label: '类型',
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        placeholder: '选择后填入路由名称和路径',
        showSearch: true,
      },
      // 菜单必须对应前端已注册的页面，否则永远显示不出来；目录可以不选
      dependencies: {
        resolve: ({ values }) => ({
          componentProps: {
            options: registeredRoutes
              .filter(
                (item) =>
                  !!item.directory ===
                  (values.menuType === MENU_TYPE_DIRECTORY),
              )
              .map((item) => ({
                label: `${item.title}  ${item.name}  ${item.path}`,
                value: item.name,
              })),
          },
          rules: values.menuType === MENU_TYPE_MENU ? 'selectRequired' : null,
        }),
        triggerFields: ['menuType'],
      },
      fieldName: 'registeredRoute',
      help: '菜单必须选择前端已注册的页面，新页面要先在 src/router/registry.ts 注册',
      label: '已注册路由',
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
      dependencies: {
        resolve: ({ values }) => ({
          disabled: values.menuType === MENU_TYPE_MENU,
        }),
        triggerFields: ['menuType'],
      },
      fieldName: 'routeName',
      label: '路由名称',
      rules: z.string().max(64, { message: '路由名称最长 64 位' }).optional(),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128, placeholder: '可空' },
      dependencies: {
        resolve: ({ values }) => ({
          disabled: values.menuType === MENU_TYPE_MENU,
        }),
        triggerFields: ['menuType'],
      },
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
      help: '停用后不出现在侧边栏，也不能再分配给角色',
      label: '状态',
      rules: 'selectRequired',
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'hidden',
      help: '隐藏只是不在侧边栏显示，有权限的账号仍然可以通过地址访问',
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
