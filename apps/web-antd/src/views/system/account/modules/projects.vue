<script lang="ts" setup>
import type { AccountMembership, AccountRecord, RoleRecord } from '#/api/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Alert, Button, Empty, message, Select } from 'ant-design-vue';

import {
  getAccountProjectsApi,
  getRoleListApi,
  updateAccountProjectsApi,
} from '#/api';
import { useProjectStore } from '#/store';

type Row = { projectId?: number; roleId?: number };

const projectStore = useProjectStore();

const account = ref<AccountRecord | null>(null);
const rows = ref<Row[]>([]);
const roles = ref<RoleRecord[]>([]);
const loading = ref(false);
const loadError = ref('');
let sequence = 0;

// 全局角色（超级管理员）只能在账号级分配，不能作为项目角色
const projectRoles = computed(() =>
  roles.value.filter((role) => !role.globalRole),
);

const roleOptions = computed(() =>
  projectRoles.value.map((role) => ({
    disabled: role.status !== 1,
    label: `${role.name}（${role.code}）${role.status === 1 ? '' : ' · 已停用'}`,
    value: role.id,
  })),
);

function projectOptions(index: number) {
  return projectStore.projects.map((project) => ({
    disabled: rows.value.some(
      (row, i) => i !== index && row.projectId === project.projectId,
    ),
    label: `${project.name}（${project.projectId}）`,
    value: project.projectId,
  }));
}

async function load(accountId: number) {
  const current = ++sequence;
  loading.value = true;
  loadError.value = '';
  try {
    const [roleList, assigned] = await Promise.all([
      getRoleListApi(),
      getAccountProjectsApi(accountId),
    ]);
    if (current !== sequence) return;
    roles.value = roleList;
    rows.value = assigned.map((item) => ({ ...item }));
  } catch {
    if (current === sequence) loadError.value = '获取项目关联失败';
  } finally {
    if (current === sequence) loading.value = false;
  }
}

const [Modal, modalApi] = useVbenModal<AccountRecord>({
  async onConfirm() {
    if (!account.value || loading.value || loadError.value) return;
    if (rows.value.some((row) => !row.projectId || !row.roleId)) {
      message.error('请为每一行选择项目和角色');
      return;
    }
    const items = rows.value as AccountMembership[];
    if (new Set(items.map((item) => item.projectId)).size !== items.length) {
      message.error('同一个项目只能关联一次');
      return;
    }
    const invalid = items.some(
      (item) =>
        !projectStore.projects.some((p) => p.projectId === item.projectId) ||
        !projectRoles.value.some((r) => r.id === item.roleId && r.status === 1),
    );
    if (invalid) {
      message.error('请选择可用的项目和角色');
      return;
    }
    modalApi.lock();
    try {
      await updateAccountProjectsApi(account.value.id, items);
      message.success('项目关联已保存');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      sequence++;
      return;
    }
    const data = modalApi.getData();
    if (!data) return;
    account.value = data;
    rows.value = [];
    void load(data.id);
  },
});
</script>

<template>
  <Modal
    :confirm-disabled="loading || !!loadError"
    :title="`关联项目 · ${account?.account ?? ''}`"
    class="w-[820px]"
  >
    <Alert
      v-if="loadError"
      :message="loadError"
      class="mb-4"
      show-icon
      type="error"
    >
      <template #action>
        <Button size="small" @click="account && load(account.id)">重试</Button>
      </template>
    </Alert>
    <div
      v-for="(row, index) in rows"
      :key="index"
      class="mb-3 grid grid-cols-[1fr_1fr_auto] items-end gap-3"
    >
      <div>
        <div class="mb-1 text-sm">项目</div>
        <Select
          v-model:value="row.projectId"
          :options="projectOptions(index)"
          class="w-full"
          option-filter-prop="label"
          placeholder="选择项目"
          show-search
        />
      </div>
      <div>
        <div class="mb-1 text-sm">角色</div>
        <Select
          v-model:value="row.roleId"
          :disabled="loading || !!loadError"
          :loading="loading"
          :options="roleOptions"
          class="w-full"
          option-filter-prop="label"
          placeholder="选择已有角色"
          show-search
        />
      </div>
      <Button aria-label="移除项目关联" @click="rows.splice(index, 1)">
        <IconifyIcon icon="lucide:trash-2" />
      </Button>
    </div>
    <Empty
      v-if="rows.length === 0 && !loadError"
      :description="loading ? '加载中' : '暂无项目关联'"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <Button
      :disabled="
        projectStore.projects.length === 0 ||
        rows.length >= projectStore.projects.length ||
        loading ||
        !!loadError
      "
      @click="rows.push({})"
    >
      <IconifyIcon class="mr-1 inline" icon="lucide:plus" />
      添加项目
    </Button>
  </Modal>
</template>
