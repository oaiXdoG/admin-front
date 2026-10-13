import type { RouteRecordRaw } from 'vue-router';

import type { ProjectItem } from '#/api/types';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { preferences } from '@vben/preferences';
import { useAccessStore, useTabbarStore, useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';
import { defineStore } from 'pinia';

import { createProjectApi, getProjectListApi, switchProjectApi } from '#/api';

function hasRouteName(routes: RouteRecordRaw[], name: string): boolean {
  return routes.some(
    (route) => route.name === name || hasRouteName(route.children ?? [], name),
  );
}

/**
 * 当前项目：菜单权限按项目区分，切换项目后要重新获取菜单并重建路由
 */
export const useProjectStore = defineStore('project', () => {
  const router = useRouter();
  const accessStore = useAccessStore();
  const tabbarStore = useTabbarStore();
  const userStore = useUserStore();

  const projects = ref<ProjectItem[]>([]);
  const currentProjectId = ref<null | number>(null);
  const loaded = ref(false);
  const switching = ref(false);
  const createOpen = ref(false);

  const currentProject = computed(() =>
    projects.value.find((item) => item.projectId === currentProjectId.value),
  );
  const canManage = computed(() =>
    hasRouteName(accessStore.accessRoutes, 'manage_project'),
  );
  /** 有项目管理权限但还没有任何项目时，必须先创建项目 */
  const mustCreate = computed(
    () => loaded.value && canManage.value && projects.value.length === 0,
  );

  async function load() {
    const data = await getProjectListApi();
    projects.value = data.projects;
    currentProjectId.value = data.currentProjectId ?? null;
    loaded.value = true;
  }

  /**
   * 重新生成菜单和路由：标记权限未检查，再导航一次让路由守卫重新拉取菜单
   */
  async function reloadAccess() {
    const { resetRoutes } = await import('#/router');
    const fullPath = router.currentRoute.value.fullPath;
    accessStore.setIsAccessChecked(false);
    resetRoutes();
    await router.replace({ force: true, path: fullPath });

    // 当前页面在新项目下没有权限时回到首页
    if (router.currentRoute.value.name === 'FallbackNotFound') {
      await router.replace(
        userStore.userInfo?.homePath || preferences.app.defaultHomePath,
      );
    }
    // 关掉新项目下已经没有权限的标签页
    const stale = tabbarStore.getTabs.filter(
      (tab) => tab.name && !router.hasRoute(tab.name as string),
    );
    for (const tab of stale) {
      await tabbarStore.closeTab(tab, router);
    }
    // 页面组件没有重新挂载时，强制刷新一次以加载新项目的数据
    await tabbarStore.refresh(router);
  }

  async function switchTo(projectId: number) {
    if (switching.value || projectId === currentProjectId.value) return;
    switching.value = true;
    try {
      const result = await switchProjectApi(projectId);
      if (result.currentProjectId !== projectId) {
        throw new Error('服务器返回的项目不一致，请重新切换项目');
      }
      currentProjectId.value = projectId;
      await reloadAccess();
      message.success(`已切换到「${currentProject.value?.name ?? ''}」`);
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
      await load().catch(() => undefined);
    } finally {
      switching.value = false;
    }
  }

  async function create(values: {
    appKey: string;
    description?: string;
    name: string;
    templateIds?: number[];
  }) {
    const created = await createProjectApi(values);
    message.success('项目已创建');
    createOpen.value = false;
    await load();
    currentProjectId.value = created.currentProjectId ?? created.projectId;
    await reloadAccess();
    if (router.hasRoute('manage_project')) {
      await router.push({ name: 'manage_project' });
    }
  }

  /**
   * 服务器提示项目不一致时，以服务器为准重新同步项目和菜单
   */
  async function recover() {
    if (switching.value) return;
    switching.value = true;
    try {
      await load();
      await reloadAccess();
    } finally {
      switching.value = false;
    }
  }

  function $reset() {
    projects.value = [];
    currentProjectId.value = null;
    loaded.value = false;
    switching.value = false;
    createOpen.value = false;
  }

  return {
    $reset,
    canManage,
    create,
    createOpen,
    currentProject,
    currentProjectId,
    load,
    loaded,
    mustCreate,
    projects,
    recover,
    reloadAccess,
    switching,
    switchTo,
  };
});
