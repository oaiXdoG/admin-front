<script lang="ts" setup>
import type { ProcessTypeRecord } from '#/api/types';

import { ref } from 'vue';

import { useAccess } from '@vben/access';

import { Button, Empty, Input, message, Modal, Tag } from 'ant-design-vue';

import { removeProcessTypeApi, saveProcessTypeApi } from '#/api';

/** 进程类型：项目内自定义的分类（登录服、游戏服等），进程列表按类型筛选 */
const props = defineProps<{ open: boolean; projectId: number; types: ProcessTypeRecord[] }>();
const emit = defineEmits<{ changed: []; close: [] }>();

const { hasAccessByCodes } = useAccess();
/** null 为不在编辑，id 为 null 为新建 */
const editing = ref<null | { id: null | number; name: string }>(null);
const saving = ref(false);

function edit(type: null | ProcessTypeRecord) {
  editing.value = type ? { id: type.id, name: type.name } : { id: null, name: '' };
}

async function save() {
  if (!editing.value) return;
  const name = editing.value.name.trim();
  if (!name) {
    message.warning('请输入类型名称');
    return;
  }
  saving.value = true;
  try {
    await saveProcessTypeApi(props.projectId, editing.value.id, name);
    message.success(editing.value.id ? '类型已保存' : '类型已创建');
    editing.value = null;
    emit('changed');
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

function remove(type: ProcessTypeRecord) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除进程类型「${type.name}」？`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除类型',
    async onOk() {
      await removeProcessTypeApi(props.projectId, type.id);
      message.success('类型已删除');
      emit('changed');
    },
  });
}
</script>

<template>
  <Modal :footer="null" :open="open" :width="520" title="进程类型" @cancel="emit('close'); editing = null">
    <div
      v-for="type in types"
      :key="type.id"
      class="server-type flex items-center justify-between gap-2"
    >
      <template v-if="editing && editing.id === type.id">
        <Input v-model:value="editing.name" :maxlength="32" class="flex-1" @press-enter="save" />
        <div class="flex gap-2">
          <Button size="small" @click="editing = null">取消</Button>
          <Button :loading="saving" size="small" type="primary" @click="save">保存</Button>
        </div>
      </template>
      <template v-else>
        <div>
          <span class="font-medium">{{ type.name }}</span>
          <span class="ml-2"><Tag>{{ type.processCount }} 个进程</Tag></span>
        </div>
        <div v-if="hasAccessByCodes(['server_process:update'])">
          <Button size="small" type="link" @click="edit(type)">重命名</Button>
          <Button
            :disabled="type.processCount > 0"
            danger
            size="small"
            type="link"
            @click="remove(type)"
          >
            删除
          </Button>
        </div>
      </template>
    </div>
    <Empty v-if="types.length === 0" :image="Empty.PRESENTED_IMAGE_SIMPLE" description="还没有类型" />
    <template v-if="hasAccessByCodes(['server_process:update'])">
      <div v-if="editing && editing.id === null" class="mt-4 flex items-center gap-2">
        <Input
          v-model:value="editing.name"
          :maxlength="32"
          class="flex-1"
          placeholder="类型名称，例如 游戏服"
          @press-enter="save"
        />
        <Button @click="editing = null">取消</Button>
        <Button :loading="saving" type="primary" @click="save">保存</Button>
      </div>
      <div v-else class="mt-4">
        <Button block type="dashed" @click="edit(null)">新建类型</Button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.server-type {
  min-height: 44px;
  padding: 6px 0;
  border-bottom: 1px solid hsl(var(--border));
}
</style>
