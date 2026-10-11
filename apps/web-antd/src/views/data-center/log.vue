<script lang="ts" setup>
import { computed } from 'vue';

import { Page } from '@vben/common-ui';

import { useProjectStore } from '#/store';

import QueryWorkspace from './components/query-workspace.vue';
import { useDataCenterStore } from './store';

const projectStore = useProjectStore();
const dataCenterStore = useDataCenterStore();

const templates = computed(() =>
  dataCenterStore.listByProject(projectStore.currentProjectId),
);
</script>

<template>
  <Page>
    <QueryWorkspace
      :key="`${projectStore.currentProjectId}-log`"
      :templates="templates"
      category="log"
    />
  </Page>
</template>
