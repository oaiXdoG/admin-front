<script lang="ts" setup>
import type { MenuRecord, MenuWrite } from '#/api/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createMenuApi, updateMenuApi } from '#/api';
import { registeredRoutes } from '#/router/registry';

import { useFormSchema } from '../data';

export type MenuEditor =
  | { mode: 'create'; parent: MenuRecord | null }
  | { mode: 'edit'; record: MenuRecord };

interface FormValues {
  hidden: boolean;
  icon?: string;
  menuId: number;
  menuType: number;
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
    // 选择已注册路由后自动填入类型、路由名称和路径
    if (!fieldsChanged.includes('registeredRoute')) return;
    const route = registeredRoutes.find(
      (item) => item.name === values.registeredRoute,
    );
    if (!route) return;
    formApi.setValues({
      menuType: route.directory ? 1 : 2,
      name: values.name || route.title,
      routeName: route.name,
      routePath: route.path,
    });
  },
  schema: useFormSchema(false),
  showDefaultActions: false,
});

function toWrite(values: FormValues, parentId?: number): MenuWrite {
  return {
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
      if (editor.value.mode === 'create') {
        const parentId = editor.value.parent?.id;
        await createMenuApi({
          ...toWrite(values, parentId && parentId > 0 ? parentId : undefined),
          menuId: values.menuId,
        });
        message.success('菜单已新增');
      } else {
        await updateMenuApi(
          editor.value.record.id,
          toWrite(values, editor.value.record.parentId),
        );
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
    formApi.setState({ schema: useFormSchema(data.mode === 'edit') });
    formApi.reset();
    if (data.mode === 'edit') {
      const { record } = data;
      formApi.setValues({
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
