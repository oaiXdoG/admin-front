<script lang="ts" setup>
import type { MenuRecord, RoleRecord } from '#/api/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message, Spin, Tree } from 'ant-design-vue';

import { getRoleMenusApi, updateRoleMenusApi } from '#/api';

interface TreeNode {
  children: TreeNode[];
  key: number;
  title: string;
}

const role = ref<null | RoleRecord>(null);
const menus = ref<MenuRecord[]>([]);
const checkedKeys = ref<number[]>([]);
const loading = ref(false);

const treeData = computed(() => {
  const byParent = new Map<number, MenuRecord[]>();
  for (const menu of menus.value) {
    const list = byParent.get(menu.parentId || 0) ?? [];
    list.push(menu);
    byParent.set(menu.parentId || 0, list);
  }
  const build = (parentId: number): TreeNode[] =>
    (byParent.get(parentId) ?? []).map((menu) => ({
      children: build(menu.id),
      key: menu.id,
      title: `${menu.name}${menu.routeName ? ` (${menu.routeName})` : ''}`,
    }));
  return build(0);
});

function onCheck(keys: unknown) {
  const list = Array.isArray(keys)
    ? keys
    : (keys as { checked: (number | string)[] }).checked;
  checkedKeys.value = list.map(Number);
}

const [Modal, modalApi] = useVbenModal<RoleRecord>({
  async onConfirm() {
    if (!role.value) return;
    modalApi.lock();
    try {
      await updateRoleMenusApi(role.value.id, checkedKeys.value);
      message.success('角色权限已保存');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const current = modalApi.getData();
    if (!current) return;
    role.value = current;
    menus.value = [];
    checkedKeys.value = [];
    loading.value = true;
    try {
      const data = await getRoleMenusApi(current.id);
      menus.value = data.menus;
      checkedKeys.value = data.menuIds;
    } catch {
      modalApi.close();
    } finally {
      loading.value = false;
    }
  },
});
</script>

<template>
  <Modal :title="`分配菜单：${role?.name ?? ''}`" class="w-[520px]">
    <Spin :spinning="loading">
      <Tree
        :checked-keys="checkedKeys"
        :tree-data="treeData"
        checkable
        default-expand-all
        @check="onCheck"
      />
    </Spin>
  </Modal>
</template>
