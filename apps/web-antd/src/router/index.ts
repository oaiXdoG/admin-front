import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import { traverseTreeValues } from '@vben/utils';

import { createRouterGuard } from './guard';
import { routes } from './routes';

/**
 *  @zh_CN 创建vue-router实例
 */
const router = createRouter({
  history:
    import.meta.env.VITE_ROUTER_HISTORY === 'hash'
      ? createWebHashHistory(import.meta.env.VITE_BASE)
      : createWebHistory(import.meta.env.VITE_BASE),
  // 应该添加到路由的初始路由列表。
  routes,
  scrollBehavior: (to, _from, savedPosition) => {
    if (savedPosition) {
      return savedPosition;
    }
    return to.hash ? { behavior: 'smooth', el: to.hash } : { left: 0, top: 0 };
  },
  // 是否应该禁止尾部斜杠。
  // strict: true,
});

/**
 * 静态路由的名称，在动态路由加入之前记下来。
 * vben 生成动态路由时会把它们 push 进根路由的 children，这个数组和静态路由表是同一个对象，
 * 所以重置时不能再从 routes 里读静态路由名称。
 */
const staticRouteNames = new Set(
  traverseTreeValues(routes, (route) => route.name),
);

/**
 * 重置为静态路由，切换项目、退出登录时调用，否则旧项目的页面会被重新加回来
 */
const resetRoutes = () => {
  for (const { name } of router.getRoutes()) {
    if (name && !staticRouteNames.has(name) && router.hasRoute(name)) {
      router.removeRoute(name);
    }
  }
  const root = router.getRoutes().find((item) => item.path === '/');
  if (root) {
    root.children = root.children.filter((item) =>
      staticRouteNames.has(item.name as string),
    );
  }
};

// 创建路由守卫
createRouterGuard(router);

export { resetRoutes, router };
