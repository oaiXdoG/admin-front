<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { useProjectStore } from '#/store';

import ProcessWorkspace from './components/process-workspace.vue';

const projectStore = useProjectStore();
</script>

<template>
  <Page auto-content-height>
    <div v-if="projectStore.currentProjectId === null" class="server-empty">
      请选择项目
    </div>
    <ProcessWorkspace
      v-else
      :key="projectStore.currentProjectId"
      mode="monitor"
      :project="projectStore.currentProject?.name ?? ''"
    />
  </Page>
</template>

<style scoped>
.server-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  padding: 24px;
  color: #98a1b2;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}
</style>
