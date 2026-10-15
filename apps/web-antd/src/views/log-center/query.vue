<script lang="ts" setup>
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { useProjectStore } from '#/store';

import LogWorkspace from './components/log-workspace.vue';

const route = useRoute();
const projectStore = useProjectStore();
</script>

<template>
  <Page auto-content-height>
    <!-- 带着 ?actor= 或 ?event= 跳转过来时重新初始化筛选条件 -->
    <LogWorkspace
      v-if="projectStore.currentProjectId !== null"
      :key="`${projectStore.currentProjectId}-${route.fullPath}`"
      :project-id="projectStore.currentProjectId"
    />
  </Page>
</template>
