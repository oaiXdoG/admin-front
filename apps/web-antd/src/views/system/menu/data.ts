import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { MenuRecord } from '#/api/types';

import { z } from '#/adapter/form';
import { SCOPE_PLATFORM, SCOPE_PROJECT } from '#/api/types';
import { registeredRoutes } from '#/router/registry';

export const MENU_TYPE_DIRECTORY = 1;

export const SCOPE_NAMES: Record<number, string> = {
  [SCOPE_PLATFORM]: '平台',
  [SCOPE_PROJECT]: '项目',
};

export const MENU_TYPE_MENU = 2;

/** 按钮挂在菜单下，routeName 保存权限标识 */
export const MENU_TYPE_BUTTON = 3;

export const MENU_TYPE_NAMES: Record<number, string> = {
  [MENU_TYPE_DIRECTORY]: '目录',
  [MENU_TYPE_MENU]: '菜单',
  [MENU_TYPE_BUTTON]: '按钮',
};

interface ParentNode {
  children: ParentNode[];
  selectable: boolean;
  title: string;
  value: number;
}

/**
 * 上级可选项：目录和菜单的上级只能是目录，按钮的上级只能是菜单（目录只用来展开）。
 * 传入的列表已排除自己和自己的下级，避免形成循环。
 */
export function buildParentTree(menus: MenuRecord[], menuType: number) {
  const forButton = menuType === MENU_TYPE_BUTTON;
  const byParent = new Map<number, MenuRecord[]>();
  for (const menu of menus) {
    const usable =
      menu.menuType === MENU_TYPE_DIRECTORY ||
      (forButton && menu.menuType === MENU_TYPE_MENU);
    if (!usable) continue;
    const list = byParent.get(menu.parentId || 0) ?? [];
    list.push(menu);
    byParent.set(menu.parentId || 0, list);
  }
  const build = (parentId: number): ParentNode[] =>
    (byParent.get(parentId) ?? [])
      .toSorted((a, b) => a.sort - b.sort || a.id - b.id)
      .map((menu) => ({
        children: build(menu.id),
        selectable: forButton
          ? menu.menuType === MENU_TYPE_MENU
          : menu.menuType === MENU_TYPE_DIRECTORY,
        title: menu.name,
        value: menu.id,
      }));
  if (forButton) return build(0);
  return [
    { children: build(0), selectable: true, title: '顶级（无上级）', value: 0 },
  ];
}

/** 上级是否符合类型要求，切换类型后用来清掉不再合法的上级 */
export function isValidParent(
  menus: MenuRecord[],
  parentId: number | undefined,
  menuType: number,
) {
  if (!parentId) return menuType !== MENU_TYPE_BUTTON;
  const parent = menus.find((menu) => menu.id === parentId);
  return (
    parent?.menuType ===
    (menuType === MENU_TYPE_BUTTON ? MENU_TYPE_MENU : MENU_TYPE_DIRECTORY)
  );
}

export function useFormSchema(menus: MenuRecord[]): VbenFormSchema[] {
  const isButton = (values: Record<string, any>) =>
    values.menuType === MENU_TYPE_BUTTON;
  return [
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '目录', value: MENU_TYPE_DIRECTORY },
          { label: '菜单', value: MENU_TYPE_MENU },
          { label: '按钮', value: MENU_TYPE_BUTTON },
        ],
      },
      defaultValue: MENU_TYPE_MENU,
      fieldName: 'menuType',
      help: '按钮挂在菜单下面，用来控制页面里的操作，例如新建、删除',
      label: '类型',
      rules: 'selectRequired',
    },
    {
      component: 'TreeSelect',
      componentProps: {
        class: 'w-full',
        showSearch: true,
        treeDefaultExpandAll: true,
        treeNodeFilterProp: 'title',
      },
      defaultValue: 0,
      dependencies: {
        resolve: ({ values }) => ({
          componentProps: {
            placeholder: isButton(values) ? '选择所属菜单' : '选择上级目录',
            treeData: buildParentTree(menus, values.menuType),
          },
        }),
        triggerFields: ['menuType'],
      },
      fieldName: 'parentId',
      label: '上级',
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '平台（系统管理类）', value: SCOPE_PLATFORM },
          { label: '项目（项目内功能）', value: SCOPE_PROJECT },
        ],
      },
      defaultValue: SCOPE_PROJECT,
      // 只有顶级目录选择范围，子项跟随上级
      dependencies: {
        resolve: ({ values }) => ({
          show: !values.parentId && !isButton(values),
        }),
        triggerFields: ['parentId', 'menuType'],
      },
      fieldName: 'scope',
      help: '平台菜单只能分配给平台角色；项目菜单只能分配给角色模板和项目角色。子项自动跟随上级目录',
      label: '范围',
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
          show: !isButton(values),
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
      component: 'Input',
      componentProps: { maxlength: 64, placeholder: '例如 manage_user:create' },
      dependencies: {
        resolve: ({ values }) => ({
          rules: isButton(values)
            ? z
                .string()
                .trim()
                .min(1, { message: '请输入权限标识' })
                .max(64, { message: '权限标识最长 64 位' })
                .regex(/^[\w-]+:[\w-]+$/, {
                  message: '格式为 页面路由名称:操作',
                })
            : null,
          show: isButton(values),
        }),
        triggerFields: ['menuType'],
      },
      fieldName: 'authCode',
      help: '服务器按权限标识校验接口，前端按它显示按钮。格式为「页面路由名称:操作」，必须与后端代码一致',
      label: '权限标识',
    },
    {
      component: 'IconPicker',
      componentProps: { placeholder: '可空，例如 lucide:users' },
      dependencies: {
        resolve: ({ values }) => ({ show: !isButton(values) }),
        triggerFields: ['menuType'],
      },
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
          show: !isButton(values),
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
          show: !isButton(values),
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
      dependencies: {
        resolve: ({ values }) => ({ show: !isButton(values) }),
        triggerFields: ['menuType'],
      },
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
    {
      field: 'scope',
      slots: { default: 'scope' },
      title: '范围',
      width: 80,
    },
    {
      field: 'menuType',
      formatter: ({ cellValue }) => MENU_TYPE_NAMES[cellValue] ?? '—',
      title: '类型',
      width: 90,
    },
    { field: 'routeName', minWidth: 180, title: '路由名称 / 权限标识' },
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
