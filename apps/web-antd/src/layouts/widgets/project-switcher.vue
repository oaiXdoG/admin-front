<script lang="ts" setup>
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Select } from 'ant-design-vue';

import { useProjectStore } from '#/store';

const projectStore = useProjectStore();

const options = computed(() =>
  projectStore.projects.map((item) => ({
    label: item.name,
    value: item.projectId,
  })),
);

function onChange(value: unknown) {
  void projectStore.switchTo(Number(value));
}
</script>

<template>
  <div class="mr-2 flex items-center">
    <Select
      :disabled="projectStore.switching || options.length === 0"
      :loading="projectStore.switching"
      :options="options"
      :placeholder="projectStore.loaded ? '还没有项目' : '加载中'"
      :value="projectStore.currentProjectId ?? undefined"
      class="w-[200px]"
      show-search
      option-filter-prop="label"
      @change="onChange"
    >
      <template #suffixIcon>
        <IconifyIcon icon="lucide:folder-kanban" />
      </template>
    </Select>
  </div>
</template>
