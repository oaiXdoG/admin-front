<script lang="ts" setup>
import type { JvmTemplateRecord } from '#/api/types';

import { ref } from 'vue';

import { useAccess } from '@vben/access';

import { Alert, Button, Empty, Input, message, Modal, Tag } from 'ant-design-vue';

import { removeJvmTemplateApi, saveJvmTemplateApi } from '#/api';

/** JVM 参数模板：同一组进程共用的参数，修改后用到它的进程要重启才生效 */
const props = defineProps<{ open: boolean; projectId: number; templates: JvmTemplateRecord[] }>();
const emit = defineEmits<{ changed: []; close: [] }>();

const { hasAccessByCodes } = useAccess();
/** null 为不在编辑，id 为 null 为新建 */
const editing = ref<null | { id: null | number; name: string; options: string }>(null);
const saving = ref(false);

/** zfoo 官方部署脚本（zfoo/deploy.sh）使用的 JVM 参数，堆大小（-Xms / -Xmx）按进程填在进程自己的 JVM 参数里 */
const ZFOO_OPTIONS = [
  '-XX:+UseG1GC',
  '-XX:+AlwaysPreTouch',
  '-XX:AutoBoxCacheMax=10000',
  '-XX:+UseStringDeduplication',
  '-XX:+HeapDumpOnOutOfMemoryError',
  '-XX:HeapDumpPath=logs',
  '-Djdk.attach.allowAttachSelf=true',
  '-Duser.timezone=Asia/Shanghai',
  '-Dfile.encoding=UTF-8',
].join('\n');

function edit(template: JvmTemplateRecord | null) {
  editing.value = template
    ? { id: template.id, name: template.name, options: template.options }
    : { id: null, name: '', options: '' };
}

async function save() {
  if (!editing.value) return;
  if (!editing.value.name.trim()) {
    message.warning('请输入模板名称');
    return;
  }
  saving.value = true;
  try {
    await saveJvmTemplateApi(props.projectId, editing.value.id, editing.value.name.trim(), editing.value.options);
    message.success(editing.value.id ? '模板已保存，用到它的进程重启后生效' : '模板已创建');
    editing.value = null;
    emit('changed');
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

function remove(template: JvmTemplateRecord) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除 JVM 参数模板「${template.name}」？`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除模板',
    async onOk() {
      await removeJvmTemplateApi(props.projectId, template.id);
      message.success('模板已删除');
      emit('changed');
    },
  });
}
</script>

<template>
  <Modal :footer="null" :open="open" :width="720" title="JVM 参数模板" @cancel="emit('close'); editing = null">
    <div class="mb-4">
      <Alert
        message="把多个进程共用的参数（GC、编码、时区等）放在模板里，在进程的「JVM 模板」里选择；进程自己的 JVM 参数只填不同的部分（例如 -Xms / -Xmx、-Dserver.zone-id）。启动时模板参数在前、进程参数在后。修改模板后，用到它的进程会显示「待重启」。"
        show-icon
        type="info"
      />
    </div>
    <template v-if="editing">
      <Input v-model:value="editing.name" :maxlength="64" placeholder="模板名称，例如 游戏服通用" />
      <div class="mt-3">
        <Input.TextArea
          v-model:value="editing.options"
          :auto-size="{ minRows: 6, maxRows: 14 }"
          placeholder="-XX:+UseG1GC&#10;-Xlog:gc*:file=logs/gc.log:time:filecount=5,filesize=20m&#10;-Dfile.encoding=UTF-8"
        />
      </div>
      <div class="mt-3 flex justify-end gap-2">
        <Button @click="editing = null">取消</Button>
        <Button :loading="saving" type="primary" @click="save">保存</Button>
      </div>
    </template>
    <template v-else>
      <div v-for="template in templates" :key="template.id" class="server-template">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium">{{ template.name }}</span>
            <span class="ml-2"><Tag>{{ template.processCount }} 个进程</Tag></span>
          </div>
          <div v-if="hasAccessByCodes(['server_process:update'])">
            <Button size="small" type="link" @click="edit(template)">编辑</Button>
            <Button danger size="small" type="link" @click="remove(template)">删除</Button>
          </div>
        </div>
        <pre class="server-options">{{ template.options || '（空）' }}</pre>
      </div>
      <Empty v-if="templates.length === 0" :image="Empty.PRESENTED_IMAGE_SIMPLE" description="还没有模板" />
      <div v-if="hasAccessByCodes(['server_process:update'])" class="mt-4 flex gap-2">
        <Button class="flex-1" type="dashed" @click="edit(null)">新建模板</Button>
        <Button class="flex-1" type="dashed" @click="editing = { id: null, name: 'zfoo 通用（Java 21）', options: ZFOO_OPTIONS }">
          用 zfoo 推荐参数新建
        </Button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.server-template {
  padding: 10px 0;
  border-bottom: 1px solid hsl(var(--border));
}

.server-options {
  padding: 8px 12px;
  margin: 6px 0 0;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  white-space: pre-wrap;
  background: hsl(var(--accent));
  border-radius: 6px;
}
</style>
