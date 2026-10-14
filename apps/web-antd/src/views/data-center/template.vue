<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { useProjectStore } from '#/store';

import TemplateManager from './components/template-manager.vue';

const projectStore = useProjectStore();
</script>

<template>
  <Page auto-content-height>
    <div v-if="projectStore.currentProjectId === null" class="dc-empty">
      请选择项目
    </div>
    <TemplateManager
      v-else
      :key="projectStore.currentProjectId"
      :project-id="projectStore.currentProjectId"
    />
  </Page>
</template>

<style scoped>
.dc-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  padding: 24px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}
</style>
