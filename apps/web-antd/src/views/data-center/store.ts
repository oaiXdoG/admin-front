import type { Template } from './types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * 查询模板（前端原型，仅保存在本地状态中，按项目区分）
 */
export const useDataCenterStore = defineStore('data-center', () => {
  const templates = ref<Template[]>([]);

  function listByProject(projectId: null | number) {
    return templates.value.filter((item) => item.projectId === projectId);
  }

  function save(template: Template) {
    templates.value = [
      ...templates.value.filter((item) => item.id !== template.id),
      template,
    ];
  }

  function remove(id: number) {
    templates.value = templates.value.filter((item) => item.id !== id);
  }

  function $reset() {
    templates.value = [];
  }

  return { $reset, listByProject, remove, save, templates };
});
