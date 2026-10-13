<script lang="ts" setup>
import type {
  AccountMembership,
  AccountRecord,
  ProjectManageItem,
  RoleRecord,
} from '#/api/types';

import { computed, reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Alert, Button, Empty, message, Select } from 'ant-design-vue';

import {
  getAccountProjectOptionsApi,
  getAccountProjectRolesApi,
  getAccountProjectsApi,
  updateAccountProjectsApi,
} from '#/api';

/**
 * 平台视角的项目关联：每个项目选择一个该项目自己的项目角色。
 */
type Row = { projectId?: number; roleId?: number };

const emit = defineEmits<{ success: [] }>();

const account = ref<AccountRecord | null>(null);
const projects = ref<ProjectManageItem[]>([]);
const rows = ref<Row[]>([]);
/** 每个项目的可选角色，按需加载 */
const rolesByProject = reactive(new Map<number, RoleRecord[]>());
const loading = ref(false);
const loadError = ref('');
let sequence = 0;

function projectOptions(index: number) {
  return projects.value.map((project) => ({
    disabled: rows.value.some(
      (row, i) => i !== index && row.projectId === project.projectId,
    ),
    label: `${project.name}（${project.projectId}）`,
    value: project.projectId,
  }));
}

function roleOptions(row: Row) {
  const roles = row.projectId ? rolesByProject.get(row.projectId) : undefined;
  return (roles ?? []).map((role) => ({
    label: `${role.name}（${role.code}）`,
    value: role.id,
  }));
}

async function loadRoles(projectId: number) {
  if (rolesByProject.has(projectId)) return;
  rolesByProject.set(projectId, await getAccountProjectRolesApi(projectId));
}

/** change 事件早于 v-model 更新，所以用事件带过来的值 */
async function onProjectChange(row: Row, value: unknown) {
  row.projectId = value as number | undefined;
  row.roleId = undefined;
  if (row.projectId) await loadRoles(row.projectId);
}

const canAdd = computed(
  () =>
    !loading.value &&
    !loadError.value &&
    rows.value.length < projects.value.length,
);

async function load(accountId: number) {
  const current = ++sequence;
  loading.value = true;
  loadError.value = '';
  rolesByProject.clear();
  try {
    const [projectList, assigned] = await Promise.all([
      getAccountProjectOptionsApi(),
      getAccountProjectsApi(accountId),
    ]);
    await Promise.all(assigned.map((item) => loadRoles(item.projectId)));
    if (current !== sequence) return;
    projects.value = projectList;
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
    modalApi.lock();
    try {
      await updateAccountProjectsApi(
        account.value.id,
        rows.value as AccountMembership[],
      );
      message.success('项目关联已保存');
      emit('success');
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
          @change="(value) => onProjectChange(row, value)"
        />
      </div>
      <div>
        <div class="mb-1 text-sm">项目角色</div>
        <Select
          v-model:value="row.roleId"
          :disabled="!row.projectId"
          :options="roleOptions(row)"
          class="w-full"
          option-filter-prop="label"
          :placeholder="row.projectId ? '选择该项目的角色' : '先选择项目'"
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
    <Button :disabled="!canAdd" @click="rows.push({})">
      <IconifyIcon class="mr-1 inline" icon="lucide:plus" />
      添加项目
    </Button>
  </Modal>
</template>
