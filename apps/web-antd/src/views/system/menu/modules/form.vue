<script lang="ts" setup>
import type { MenuRecord, MenuWrite } from '#/api/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createMenuApi, updateMenuApi } from '#/api';
import { registeredRoutes } from '#/router/registry';

import {
  isValidParent,
  MENU_TYPE_BUTTON,
  MENU_TYPE_DIRECTORY,
  useFormSchema,
} from '../data';

export type MenuEditor = { menus: MenuRecord[] } & (
  | { mode: 'create'; parent: MenuRecord | null }
  | { mode: 'edit'; record: MenuRecord }
);

interface FormValues {
  authCode?: string;
  hidden: boolean;
  icon?: string;
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
/** 可选上级的范围：编辑时已排除自己和自己的下级 */
const parentCandidates = ref<MenuRecord[]>([]);

const [Form, formApi] = useVbenForm({
  handleValuesChange(values, fieldsChanged) {
    // 切换类型后，原来的上级可能不再合法（按钮只能挂在菜单下）
    if (
      fieldsChanged.includes('menuType') &&
      !isValidParent(parentCandidates.value, values.parentId, values.menuType)
    ) {
      formApi.setFieldValue(
        'parentId',
        values.menuType === MENU_TYPE_BUTTON ? undefined : 0,
      );
    }
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
  schema: useFormSchema([]),
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
  if (values.menuType === MENU_TYPE_BUTTON) {
    return {
      hidden: false,
      icon: '',
      menuType: values.menuType,
      name: values.name.trim(),
      parentId,
      routeName: values.authCode?.trim() ?? '',
      routePath: '',
      sort: values.sort ?? 0,
      status: values.status,
    };
  }
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
        await createMenuApi(toWrite(values, parentId));
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
    const excluded = isEdit
      ? [data.record.id, ...descendantIds(data.menus, data.record.id)]
      : [];
    parentCandidates.value = data.menus.filter(
      (menu) => !excluded.includes(menu.id),
    );
    formApi.setState({ schema: useFormSchema(parentCandidates.value) });
    formApi.reset();
    if (data.mode === 'create') {
      // 在菜单上「新增按钮」时类型默认为按钮
      const parent = data.parent;
      formApi.setValues(
        parent && parent.menuType !== MENU_TYPE_DIRECTORY
          ? { menuType: MENU_TYPE_BUTTON, parentId: parent.id }
          : { parentId: parent?.id ?? 0 },
      );
    } else {
      const { record } = data;
      const registered = registeredRoutes.some(
        (item) => item.name === record.routeName,
      );
      formApi.setValues({
        parentId: record.parentId || 0,
        scope: record.scope,
        registeredRoute: registered ? record.routeName : undefined,
        authCode:
          record.menuType === MENU_TYPE_BUTTON ? record.routeName : undefined,
        hidden: record.hidden,
        icon: record.icon,
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
  const parent = editor.value?.parent;
  if (!parent) return '新增菜单';
  return parent.menuType === MENU_TYPE_DIRECTORY
    ? `新增子菜单：${parent.name}`
    : `新增按钮：${parent.name}`;
});
</script>

<template>
  <Modal :title="title" class="w-[560px]">
    <Form />
  </Modal>
</template>
