<script lang="ts" setup>
import type { MenuRecord, RoleRecord } from '#/api/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message, Spin, Tree } from 'ant-design-vue';

import { getRoleMenusApi, updateRoleMenusApi } from '#/api';

interface TreeNode {
  children: TreeNode[];
  disableCheckbox: boolean;
  key: number;
  title: string;
}

const role = ref<null | RoleRecord>(null);
const menus = ref<MenuRecord[]>([]);
const checkedKeys = ref<number[]>([]);
/** 打开时已分配的菜单，用来判断停用菜单是否允许取消 */
const assignedIds = ref(new Set<number>());
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
      // 停用的菜单不会出现在侧边栏，不能再分配，已分配的仍可取消
      disableCheckbox: menu.status !== 1 && !assignedIds.value.has(menu.id),
      key: menu.id,
      title: `${menu.name}${menu.routeName ? ` (${menu.routeName})` : ''}${
        menu.status === 1 ? '' : '（已停用）'
      }`,
    }));
  return build(0);
});

/**
 * 树是父子联动的：已分配的父目录会把下面所有子菜单都显示成勾选，
 * 所以打开时只勾叶子节点，父目录的状态由树自己算出来
 */
function leafKeys(menuIds: number[]) {
  const parents = new Set(menus.value.map((menu) => menu.parentId || 0));
  return menuIds.filter((id) => !parents.has(id));
}

/**
 * 只勾部分子菜单时父目录是半选状态，不在 checkedKeys 里，
 * 保存时补上所有上级目录，否则侧边栏无法从父目录往下生成这些菜单
 */
function withAncestors(menuIds: number[]) {
  const parentOf = new Map(
    menus.value.map((menu) => [menu.id, menu.parentId || 0]),
  );
  const result = new Set<number>();
  for (const id of menuIds) {
    let current = id;
    while (current && !result.has(current)) {
      result.add(current);
      current = parentOf.get(current) ?? 0;
    }
  }
  return [...result];
}

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
      await updateRoleMenusApi(role.value.id, withAncestors(checkedKeys.value));
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
      assignedIds.value = new Set(data.menuIds);
      checkedKeys.value = leafKeys(data.menuIds);
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
      <!-- default-expand-all 只在挂载时生效，等菜单加载完再渲染 -->
      <Tree
        v-if="treeData.length > 0"
        :checked-keys="checkedKeys"
        :tree-data="treeData"
        checkable
        default-expand-all
        @check="onCheck"
      />
    </Spin>
  </Modal>
</template>
