<script lang="ts" setup>
import type { RoleRecord, RoleWrite } from '#/api/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createRoleApi, updateRoleApi } from '#/api';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const editing = ref<null | RoleRecord>(null);

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal<null | RoleRecord>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues<RoleWrite>();
    modalApi.lock();
    try {
      if (editing.value) {
        await updateRoleApi(editing.value.id, values);
        message.success('角色已修改');
      } else {
        await createRoleApi(values);
        message.success('角色已创建');
      }
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) return;
    editing.value = modalApi.getData() ?? null;
    formApi.reset();
    if (editing.value) {
      const { code, description, name, status } = editing.value;
      formApi.setValues({ code, description, name, status });
    }
  },
});

const title = computed(() => (editing.value ? '编辑角色' : '新增角色'));
</script>

<template>
  <Modal :title="title" class="w-[520px]">
    <Form />
  </Modal>
</template>
