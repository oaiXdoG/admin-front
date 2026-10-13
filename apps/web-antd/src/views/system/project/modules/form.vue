<script lang="ts" setup>
import type { ProjectItem } from '#/api/types';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { updateProjectApi } from '#/api';

import { generateAppKey, useProjectFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const [Form, formApi] = useVbenForm({
  schema: useProjectFormSchema(() =>
    formApi.setFieldValue('appKey', generateAppKey()),
  ),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal<ProjectItem>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const project = modalApi.getData();
    if (!project) return;
    const values = await formApi.getValues<{ appKey: string; name: string }>();
    modalApi.lock();
    try {
      await updateProjectApi(project.projectId, values);
      message.success('项目已修改');
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) return;
    const project = modalApi.getData();
    if (!project) return;
    formApi.setValues({ appKey: project.appKey ?? '', name: project.name });
  },
});
</script>

<template>
  <Modal class="w-[480px]" title="编辑项目">
    <Form />
  </Modal>
</template>
