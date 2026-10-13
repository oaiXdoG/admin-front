<script lang="ts" setup>
import type { MenuRecord, MenuWrite } from '#/api/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createMenuApi, updateMenuApi } from '#/api';
import { registeredRoutes } from '#/router/registry';

import { buildParentTree, useFormSchema } from '../data';

export type MenuEditor = { menus: MenuRecord[] } & (
  | { mode: 'create'; parent: MenuRecord | null }
  | { mode: 'edit'; record: MenuRecord }
);

interface FormValues {
  hidden: boolean;
  icon?: string;
  menuId: number;
  menuType: number;
  parentId: number;
  scope: number;
  name: string;
  routeName?: string;
  routePath?: string;
  sort?: number;
  status: number;
}

const emit = defineEmits<{ success: [] }>();

const editor = ref<MenuEditor | null>(null);

const [Form, formApi] = useVbenForm({
  handleValuesChange(values, fieldsChanged) {
    // 选择已注册路由后自动填入名称、路由名称和路径
    if (!fieldsChanged.includes('registeredRoute')) return;
    const route = registeredRoutes.find(
      (item) => item.name === values.registeredRoute,
    );
    formApi.setValues({
      name: values.name || route?.title || '',
      routeName: route?.name ?? '',
      routePath: route?.path ?? '',
    });
  },
  schema: useFormSchema(false, []),
  showDefaultActions: false,
});

function descendantIds(menus: MenuRecord[], id: number): number[] {
  const children = menus.filter((menu) => menu.parentId === id);
  return children.flatMap((child) => [
    child.id,
    ...descendantIds(menus, child.id),
  ]);
}

function toWrite(values: FormValues, parentId?: number): MenuWrite {
  return {
    scope: values.scope,
    hidden: values.hidden ?? false,
    icon: values.icon?.trim() ?? '',
    menuType: values.menuType,
    name: values.name.trim(),
    parentId,
    routeName: values.routeName?.trim() ?? '',
    routePath: values.routePath?.trim() ?? '',
    sort: values.sort ?? 0,
    status: values.status,
  };
}

const [Modal, modalApi] = useVbenModal<MenuEditor>({
  async onConfirm() {
    if (!editor.value) return;
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues<FormValues>();
    modalApi.lock();
    try {
      const parentId = values.parentId > 0 ? values.parentId : undefined;
      if (editor.value.mode === 'create') {
        await createMenuApi({
          ...toWrite(values, parentId),
          menuId: values.menuId,
        });
        message.success('菜单已新增');
      } else {
        await updateMenuApi(editor.value.record.id, toWrite(values, parentId));
        message.success('菜单已修改');
      }
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData();
    if (!data) return;
    editor.value = data;
    const isEdit = data.mode === 'edit';
    const excluded = isEdit ? descendantIds(data.menus, data.record.id) : [];
    const parentTree = buildParentTree(
      data.menus.filter((menu) => !excluded.includes(menu.id)),
      isEdit ? data.record.id : undefined,
    );
    formApi.setState({ schema: useFormSchema(isEdit, parentTree) });
    formApi.reset();
    if (data.mode === 'create') {
      const maxId = Math.max(0, ...data.menus.map((menu) => menu.id));
      formApi.setValues({
        menuId: maxId + 1,
        parentId: data.parent?.id ?? 0,
      });
    } else {
      const { record } = data;
      const registered = registeredRoutes.some(
        (item) => item.name === record.routeName,
      );
      formApi.setValues({
        parentId: record.parentId || 0,
        scope: record.scope,
        registeredRoute: registered ? record.routeName : undefined,
        hidden: record.hidden,
        icon: record.icon,
        menuId: record.id,
        menuType: record.menuType,
        name: record.name,
        routeName: record.routeName,
        routePath: record.routePath,
        sort: record.sort,
        status: record.status,
      });
    }
  },
});

const title = computed(() => {
  if (editor.value?.mode === 'edit') return '编辑菜单';
  return editor.value?.parent
    ? `新增子菜单：${editor.value.parent.name}`
    : '新增菜单';
});
</script>

<template>
  <Modal :title="title" class="w-[560px]">
    <Form />
  </Modal>
</template>
