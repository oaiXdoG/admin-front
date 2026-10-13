<script lang="ts" setup>
import { watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { useProjectStore } from '#/store';
import {
  generateAppKey,
  useProjectFormSchema,
} from '#/views/system/project/data';

const projectStore = useProjectStore();

const [Form, formApi] = useVbenForm({
  schema: useProjectFormSchema(
    () => formApi.setFieldValue('appKey', generateAppKey()),
    true,
  ),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues<{
      appKey: string;
      description: string;
      name: string;
      templateIds: number[];
    }>();
    modalApi.lock();
    try {
      await projectStore.create(values);
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onClosed() {
    projectStore.createOpen = false;
    formApi.reset();
  },
});

// 没有任何项目时强制创建，不能关闭
watch(
  () => projectStore.mustCreate || projectStore.createOpen,
  (open) => {
    const forced = projectStore.mustCreate;
    modalApi.setState({
      closable: !forced,
      closeOnClickModal: !forced,
      closeOnPressEscape: !forced,
      showCancelButton: !forced,
    });
    if (open) modalApi.open();
    else modalApi.close();
  },
  { immediate: true },
);
</script>

<template>
  <Modal
    :description="
      projectStore.mustCreate ? '还没有任何项目，请先创建一个项目' : ''
    "
    class="w-[480px]"
    confirm-text="创建"
    title="新建项目"
  >
    <Form />
  </Modal>
</template>
