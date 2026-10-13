<script lang="ts" setup>
import type { RoleRecord } from '#/api/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Alert,
  Checkbox,
  CheckboxGroup,
  Empty,
  message,
  Spin,
} from 'ant-design-vue';

import { getImportTemplateOptionsApi, importProjectRolesApi } from '#/api';
import { useProjectStore } from '#/store';

/**
 * 从模板导入：把模板连同菜单复制为当前项目的角色，复制后与模板互不影响。
 */
const emit = defineEmits<{ success: [] }>();

const projectStore = useProjectStore();
const templates = ref<RoleRecord[]>([]);
const selected = ref<number[]>([]);
const loading = ref(false);

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const projectId = projectStore.currentProjectId;
    if (!projectId || selected.value.length === 0) {
      message.warning('请选择要导入的模板');
      return;
    }
    modalApi.lock();
    try {
      const imported = await importProjectRolesApi(projectId, selected.value);
      const skipped = selected.value.length - imported;
      message.success(
        skipped > 0
          ? `已导入 ${imported} 个，${skipped} 个因同名或同编码已存在而跳过`
          : `已导入 ${imported} 个角色`,
      );
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen || !projectStore.currentProjectId) return;
    selected.value = [];
    loading.value = true;
    try {
      templates.value = await getImportTemplateOptionsApi(
        projectStore.currentProjectId,
      );
    } finally {
      loading.value = false;
    }
  },
});
</script>

<template>
  <Modal class="w-[520px]" confirm-text="导入" title="从模板导入">
    <Alert
      class="mb-4"
      message="模板会连同菜单权限复制到当前项目，之后可以在本项目里单独调整，不影响模板和其他项目。"
      show-icon
      type="info"
    />
    <Spin :spinning="loading">
      <CheckboxGroup v-if="templates.length > 0" v-model:value="selected">
        <div class="flex flex-col gap-2">
          <label
            v-for="template in templates"
            :key="template.id"
            class="flex items-start gap-2"
          >
            <Checkbox :value="template.id" />
            <span>
              {{ template.name }}（{{ template.code }}）
              <span class="text-muted-foreground block text-xs">
                {{ template.description || '无描述' }}
              </span>
            </span>
          </label>
        </div>
      </CheckboxGroup>
      <Empty v-else-if="!loading" description="还没有可用的角色模板" />
    </Spin>
  </Modal>
</template>
