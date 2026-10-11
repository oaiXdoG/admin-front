<script lang="ts" setup>
import { computed } from 'vue';

import { BasicLayout, UserDropdown } from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { useAuthStore, useProjectStore } from '#/store';

import ProjectCreateModal from './widgets/project-create-modal.vue';
import ProjectSwitcher from './widgets/project-switcher.vue';

const userStore = useUserStore();
const authStore = useAuthStore();
const projectStore = useProjectStore();

const avatar = computed(() => {
  return userStore.userInfo?.avatar || preferences.app.defaultAvatar;
});

/** 当前项目下的角色名，没有就显示登录名 */
const description = computed(
  () => projectStore.currentProject?.roleName || userStore.userInfo?.username,
);

async function handleLogout() {
  await authStore.logout(false);
}
</script>

<template>
  <BasicLayout
    :avatar
    :text="userStore.userInfo?.realName"
    @clear-preferences-and-logout="handleLogout"
    @logout="handleLogout"
  >
    <template #header-right-0>
      <ProjectSwitcher />
    </template>
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :description
        :menus="[]"
        :text="userStore.userInfo?.realName"
        @clear-preferences-and-logout="handleLogout"
        @logout="handleLogout"
      />
    </template>
    <template #extra>
      <ProjectCreateModal />
    </template>
  </BasicLayout>
</template>
