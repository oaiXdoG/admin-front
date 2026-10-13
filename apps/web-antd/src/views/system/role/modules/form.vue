<script lang="ts" setup>
import type { RoleKind } from '#/api';
import type { RoleRecord, RoleWrite } from '#/api/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { useRoleApi } from '#/api';
import { useProjectStore } from '#/store';

import { useFormSchema } from '../data';

interface ModalData {
  kind: RoleKind;
  role: null | RoleRecord;
}

const emit = defineEmits<{ success: [] }>();

const projectStore = useProjectStore();
const data = ref<ModalData | null>(null);

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal<ModalData>({
  async onConfirm() {
    if (!data.value) return;
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues<RoleWrite>();
    const roleApi = useRoleApi(
      data.value.kind,
      () => projectStore.currentProjectId,
    );
    modalApi.lock();
    try {
      if (data.value.role) {
        await roleApi.update(data.value.role.id, values);
        message.success('已修改');
      } else {
        await roleApi.create(values);
        message.success('已创建');
      }
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) return;
    data.value = modalApi.getData() ?? null;
    formApi.reset();
    const role = data.value?.role;
    if (role) {
      const { code, description, name, status } = role;
      formApi.setValues({ code, description, name, status });
    }
  },
});

const KIND_NAMES: Record<RoleKind, string> = {
  platform: '平台角色',
  project: '项目角色',
  template: '角色模板',
};

const title = computed(() => {
  const name = data.value ? KIND_NAMES[data.value.kind] : '';
  return data.value?.role ? `编辑${name}` : `新增${name}`;
});
</script>

<template>
  <Modal :title="title" class="w-[520px]">
    <Form />
  </Modal>
</template>
