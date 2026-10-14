<script lang="ts" setup>
import type { RoleKind } from '#/api';
import type { MenuRecord, RoleRecord } from '#/api/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message, Spin, Tree } from 'ant-design-vue';

import { useRoleApi } from '#/api';
import { useProjectStore } from '#/store';

interface ModalData {
  kind: RoleKind;
  role: RoleRecord;
}

interface TreeNode {
  children: TreeNode[];
  disableCheckbox: boolean;
  key: number;
  title: string;
}

const projectStore = useProjectStore();
const role = ref<null | RoleRecord>(null);
let roleApi = useRoleApi('platform');
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
      disableCheckbox: !checkable(menu),
      key: menu.id,
      title: `${menu.name}${menu.routeName ? ` (${menu.routeName})` : ''}${
        menu.status === 1 ? '' : '（已停用）'
      }`,
    }));
  return build(0);
});

/** 可以勾选的菜单：停用的菜单只有已分配时才能操作（取消） */
function checkable(menu: MenuRecord) {
  return menu.status === 1 || assignedIds.value.has(menu.id);
}

function descendantIds(id: number): number[] {
  return menus.value
    .filter((menu) => (menu.parentId || 0) === id && checkable(menu))
    .flatMap((menu) => [menu.id, ...descendantIds(menu.id)]);
}

/**
 * 子项必须连同所有上级一起分配，否则侧边栏无法从目录往下生成菜单，按钮也依赖所在页面
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

/**
 * 父子各自独立勾选（菜单页面可以只分配查看、不分配按钮），联动规则自己处理：
 * 勾选时带上所有上级和全部下级，取消时一起取消全部下级
 */
function onCheck(_keys: unknown, info: { checked: boolean; node: { key: number | string } }) {
  const id = Number(info.node.key);
  const related = [id, ...descendantIds(id)];
  checkedKeys.value = info.checked
    ? withAncestors([...new Set([...checkedKeys.value, ...related])])
    : checkedKeys.value.filter((key) => !related.includes(key));
}

const [Modal, modalApi] = useVbenModal<ModalData>({
  async onConfirm() {
    if (!role.value) return;
    modalApi.lock();
    try {
      await roleApi.updateMenus(
        role.value.id,
        withAncestors(checkedKeys.value),
      );
      message.success('角色权限已保存');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const modalData = modalApi.getData();
    if (!modalData) return;
    const current = modalData.role;
    roleApi = useRoleApi(modalData.kind, () => projectStore.currentProjectId);
    role.value = current;
    menus.value = [];
    checkedKeys.value = [];
    loading.value = true;
    try {
      const data = await roleApi.menus(current.id);
      menus.value = data.menus;
      assignedIds.value = new Set(data.menuIds);
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
      <!-- default-expand-all 只在挂载时生效，等菜单加载完再渲染 -->
      <Tree
        v-if="treeData.length > 0"
        :checked-keys="checkedKeys"
        :tree-data="treeData"
        check-strictly
        checkable
        default-expand-all
        @check="onCheck"
      />
    </Spin>
  </Modal>
</template>
