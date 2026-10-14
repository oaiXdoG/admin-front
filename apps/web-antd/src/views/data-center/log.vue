<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { useProjectStore } from '#/store';

import QueryWorkspace from './components/query-workspace.vue';

const projectStore = useProjectStore();
</script>

<template>
  <Page>
    <QueryWorkspace
      v-if="projectStore.currentProjectId !== null"
      :key="projectStore.currentProjectId"
      :project-id="projectStore.currentProjectId"
      category="log"
    />
  </Page>
</template>
