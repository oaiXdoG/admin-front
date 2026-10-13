<script lang="ts" setup>
import type { AccountRecord } from '#/api/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createAccountApi, updateAccountApi } from '#/api';

import { useCreateFormSchema, useEditFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const editing = ref<AccountRecord | null>(null);

const [Form, formApi] = useVbenForm({
  schema: useCreateFormSchema(),
  showDefaultActions: false,
});

const title = computed(() =>
  editing.value ? `编辑用户 · ${editing.value.account}` : '新增账号',
);

const [Modal, modalApi] = useVbenModal<AccountRecord | null>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    modalApi.lock();
    try {
      if (editing.value) {
        await updateAccountApi(editing.value.id, {
          password: values.password,
          remark: values.remark,
          username: values.username,
        });
        message.success('用户已更新');
      } else {
        await createAccountApi({
          account: values.account,
          password: values.password,
          remark: values.remark,
          username: values.username,
        });
        message.success('账号已创建');
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
    formApi.setState({
      schema: editing.value ? useEditFormSchema() : useCreateFormSchema(),
    });
    formApi.reset();
    if (editing.value) {
      formApi.setValues({
        password: '',
        remark: editing.value.remark ?? '',
        username: editing.value.username,
      });
    }
  },
});
</script>

<template>
  <Modal :title="title" class="w-[560px]">
    <div v-if="editing" class="mb-4 flex gap-6 text-sm text-muted-foreground">
      <span>用户 ID：{{ editing.id }}</span>
      <span>登录名：{{ editing.account }}</span>
    </div>
    <Form />
  </Modal>
</template>
