<script lang="ts" setup>
import type { Template } from './types';

import { computed } from 'vue';

import { Page } from '@vben/common-ui';

import { useProjectStore } from '#/store';

import TemplateManager from './components/template-manager.vue';
import { useDataCenterStore } from './store';

const projectStore = useProjectStore();
const dataCenterStore = useDataCenterStore();

const templates = computed(() =>
  dataCenterStore.listByProject(projectStore.currentProjectId),
);

function onSave(template: Template) {
  dataCenterStore.save(template);
}

function onRemove(id: number) {
  dataCenterStore.remove(id);
}
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
      :templates="templates"
      @remove="onRemove"
      @save="onSave"
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
