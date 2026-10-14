import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
  RouteRecordStringComponent,
} from '@vben/types';

import type { MenuRecord } from '#/api/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { getAccessMenusApi } from '#/api';
import { MENU_BUTTON } from '#/api/types';
import { BasicLayout, IFrameView } from '#/layouts';
import { useProjectStore } from '#/store';

import { findRegisteredRoute } from './registry';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

const DIRECTORY = 1;
const ENABLED = 1;

/** 只认 iconify 名称（如 lucide:users），其他旧值按默认图标处理 */
function menuIcon(menu: MenuRecord) {
  if (menu.icon?.includes(':')) return menu.icon;
  return menu.menuType === DIRECTORY ? 'lucide:layout-grid' : undefined;
}

/**
 * 把后端返回的平铺菜单转换成 vben 的路由结构。
 * 只有在 registry.ts 里注册过的路由才会生成页面，未注册的菜单直接忽略。
 */
function toRoutes(menus: MenuRecord[]): RouteRecordStringComponent[] {
  const byParent = new Map<number, MenuRecord[]>();
  for (const menu of menus) {
    if (menu.status !== ENABLED || menu.menuType === MENU_BUTTON) continue;
    const parentId = menu.parentId || 0;
    const list = byParent.get(parentId) ?? [];
    list.push(menu);
    byParent.set(parentId, list);
  }

  const build = (parentId: number): RouteRecordStringComponent[] =>
    (byParent.get(parentId) ?? [])
      .toSorted((a, b) => a.sort - b.sort || a.id - b.id)
      .flatMap((menu): RouteRecordStringComponent[] => {
        const registered = findRegisteredRoute(menu.routeName, menu.routePath);
        if (!registered) return [];
        const meta = {
          // 页签只按路径区分，页面内用查询参数（如系统设置的 ?tab=）不会多开页签
          fullPathKey: false,
          hideInMenu: menu.hidden,
          icon: menuIcon(menu),
          order: menu.sort,
          title: menu.name || registered.title,
        };
        if (menu.menuType === DIRECTORY || registered.directory) {
          const children = build(menu.id);
          if (children.length === 0) return [];
          // 目录本身不渲染页面，children 不为空时 vben 会去掉 component
          return [
            {
              children,
              component: 'BasicLayout',
              meta,
              name: registered.name,
              path: registered.path,
            },
          ];
        }
        if (!registered.component) return [];
        return [
          {
            component: registered.component,
            meta,
            name: registered.name,
            path: registered.path,
          },
        ];
      });

  return build(0);
}

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      const projectStore = useProjectStore();
      const menus =
        (await getAccessMenusApi(projectStore.currentProjectId)) ?? [];
      // 按钮不生成路由，权限标识交给 vben 的权限码，页面用 useAccess().hasAccessByCodes 判断
      useAccessStore().setAccessCodes(
        menus
          .filter(
            (menu) => menu.menuType === MENU_BUTTON && menu.status === ENABLED,
          )
          .map((menu) => menu.routeName),
      );
      return toRoutes(menus);
    },
    forbiddenComponent,
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
