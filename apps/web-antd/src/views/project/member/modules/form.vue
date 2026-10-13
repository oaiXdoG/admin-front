<script lang="ts" setup>
import type { ProjectMember } from '#/api/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/form';
import {
  addProjectMemberApi,
  getMemberRoleOptionsApi,
  updateProjectMemberApi,
} from '#/api';
import { useProjectStore } from '#/store';

/**
 * 添加成员（按登录名拉入已有账号）或修改成员的项目角色。账号由平台统一创建。
 */
const emit = defineEmits<{ success: [] }>();

const projectStore = useProjectStore();
const editing = ref<null | ProjectMember>(null);

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Input',
      componentProps: { maxlength: 64, placeholder: '请输入已有账号的登录名' },
      dependencies: {
        resolve: () => ({ disabled: editing.value !== null }),
        triggerFields: ['account'],
      },
      fieldName: 'account',
      help: '账号由平台在「系统管理 → 用户管理」创建，这里只能添加已有账号',
      label: '登录名',
      rules: z.string().trim().min(1, { message: '请输入登录名' }),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: () => getMemberRoleOptionsApi(projectStore.currentProjectId ?? 0),
        class: 'w-full',
        labelField: 'name',
        placeholder: '选择本项目的角色',
        valueField: 'id',
      },
      fieldName: 'roleId',
      label: '项目角色',
      rules: 'selectRequired',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal<null | ProjectMember>({
  async onConfirm() {
    const projectId = projectStore.currentProjectId;
    if (!projectId) return;
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues<{
      account: string;
      roleId: number;
    }>();
    modalApi.lock();
    try {
      if (editing.value) {
        await updateProjectMemberApi(
          projectId,
          editing.value.accountId,
          values.roleId,
        );
        message.success('成员角色已修改');
      } else {
        await addProjectMemberApi(projectId, values.account, values.roleId);
        message.success('成员已添加');
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
      formApi.setValues({
        account: editing.value.account,
        roleId: editing.value.roleId,
      });
    }
  },
});

const title = computed(() =>
  editing.value ? `修改角色 · ${editing.value.account}` : '添加成员',
);
</script>

<template>
  <Modal :title="title" class="w-[480px]">
    <Form />
  </Modal>
</template>
