<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

import type { Category, Template, TemplateValues } from '../types';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { useAccess } from '@vben/access';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Select,
  Tag,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createQueryTemplateApi,
  getQueryTemplatesApi,
  removeQueryTemplateApi,
  updateQueryTemplateApi,
} from '#/api';

import { categories, parseTemplate } from '../types';
import FieldMappingEditor from './field-mapping-editor.vue';

const props = defineProps<{ projectId: number }>();

const { hasAccessByCodes } = useAccess();

const nameRules: Rule[] = [
  { message: '请输入模板名称', required: true, whitespace: true },
];
const categoryRules: Rule[] = [{ required: true }];
const eventRules: Rule[] = [
  { message: '请输入事件名', required: true, whitespace: true },
  {
    message: '小写字母开头，只能包含小写字母、数字和下划线',
    pattern: /^[a-z][a-z0-9_]{0,63}$/,
  },
];

const editor = ref<'new' | null | Template>(null);
const formRef = ref<FormInstance>();
const formState = ref<TemplateValues>(emptyValues());
const saving = ref(false);
/** 当前连接的日志库，提示查询的是哪个环境 */
const database = ref('');

const editorOpen = computed(() => editor.value !== null);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        component: 'Input',
        componentProps: { allowClear: true, placeholder: '请输入模板名称' },
        fieldName: 'keyword',
        label: '模板名称',
      },
      {
        component: 'Select',
        componentProps: {
          allowClear: true,
          options: categories,
          placeholder: '全部分类',
        },
        fieldName: 'category',
        label: '分类',
      },
    ],
    submitOnChange: true,
  },
  gridOptions: {
    columns: [
      { align: 'left', field: 'name', minWidth: 200, title: '模板名称' },
      {
        field: 'category',
        slots: { default: 'category' },
        title: '分类',
        width: 120,
      },
      { align: 'left', field: 'event', minWidth: 200, title: '事件名' },
      {
        field: 'fields',
        formatter: ({ cellValue }) => `${cellValue.length} 个`,
        title: '字段',
        width: 90,
      },
      {
        field: 'operation',
        fixed: 'right',
        slots: { default: 'action' },
        title: '操作',
        width: 140,
      },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async (
          { page },
          formValues: { category?: Category; keyword?: string },
        ) => {
          const keyword = formValues.keyword?.trim() ?? '';
          const result = await getQueryTemplatesApi(props.projectId);
          database.value = result.database;
          const rows = result.list
            .map(parseTemplate)
            .filter(
              (item) =>
                (item.name.includes(keyword) || item.event.includes(keyword)) &&
                (!formValues.category || item.category === formValues.category),
            );
          const start = (page.currentPage - 1) * page.pageSize;
          return {
            items: rows.slice(start, start + page.pageSize),
            total: rows.length,
          };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<Template>,
});

function emptyValues(): TemplateValues {
  return { category: 'log', event: '', fields: [], name: '' };
}

function open(template: 'new' | Template) {
  if (template === 'new') {
    formState.value = emptyValues();
  } else {
    const { category, event, fields, name } = JSON.parse(
      JSON.stringify(template),
    ) as Template;
    formState.value = { category, event, fields, name };
  }
  editor.value = template;
}

function close() {
  editor.value = null;
}

async function submit() {
  if (!editor.value) return;
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  const values = JSON.parse(JSON.stringify(formState.value)) as TemplateValues;
  if (values.fields.length === 0) {
    message.error('请至少添加一个字段');
    return;
  }
  const data = {
    category: values.category,
    event: values.event.trim(),
    fields: JSON.stringify(
      values.fields.map((field) => ({
        ...field,
        key: field.key.trim(),
        label: field.label.trim(),
        source: field.source.trim(),
      })),
    ),
    name: values.name.trim(),
  };
  saving.value = true;
  try {
    await (editor.value === 'new'
      ? createQueryTemplateApi(props.projectId, data)
      : updateQueryTemplateApi(props.projectId, editor.value.id, data));
    message.success('模板已保存');
    close();
    gridApi.query();
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

function confirmRemove(row: Template) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除「${row.name}」？`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除模板',
    async onOk() {
      await removeQueryTemplateApi(props.projectId, row.id);
      message.success('模板已删除');
      gridApi.query();
    },
  });
}
</script>

<template>
  <div class="h-full">
    <Grid table-title="查询模板">
      <template #toolbar-actions>
        <span class="ml-2">
          <Tag v-if="database" color="orange">日志库：{{ database }}</Tag>
          <Tag v-else>未配置日志存储</Tag>
        </span>
      </template>
      <template #toolbar-tools>
        <Button
          v-if="hasAccessByCodes(['data_template:create'])"
          type="primary"
          @click="open('new')"
        >
          <template #icon>
            <IconifyIcon class="size-4" icon="lucide:plus" />
          </template>
          新增模板
        </Button>
      </template>
      <template #category="{ row }">
        <Tag :color="row.category === 'data' ? 'blue' : 'green'">
          {{ row.category === 'data' ? '数据查询' : '日志查询' }}
        </Tag>
      </template>
      <template #action="{ row }">
        <Button
          v-if="hasAccessByCodes(['data_template:update'])"
          size="small"
          type="link"
          @click="open(row)"
        >
          编辑
        </Button>
        <Button
          v-if="hasAccessByCodes(['data_template:remove'])"
          danger
          size="small"
          type="link"
          @click="confirmRemove(row)"
        >
          删除
        </Button>
      </template>
    </Grid>

    <Modal
      :open="editorOpen"
      :confirm-loading="saving"
      :title="editor === 'new' ? '新增查询模板' : '编辑查询模板'"
      :width="1100"
      cancel-text="取消"
      destroy-on-close
      ok-text="保存"
      @cancel="close"
      @ok="submit"
    >
      <Form
        ref="formRef"
        :model="formState"
        :required-mark="false"
        class="dc-editor-form"
        layout="vertical"
      >
        <section class="dc-editor-section">
          <h3>基本信息</h3>
          <div class="dc-basic-grid">
            <FormItem label="模板名称" name="name" :rules="nameRules">
              <Input
                v-model:value="formState.name"
                placeholder="请输入模板名称"
              />
            </FormItem>
            <FormItem label="分类" name="category" :rules="categoryRules">
              <Select
                v-model:value="formState.category"
                :options="categories"
              />
            </FormItem>
          </div>
          <FormItem
            extra="与业务代码里 LogReporter.event(...) 的事件名一致"
            label="事件名"
            name="event"
            :rules="eventRules"
          >
            <Input
              v-model:value="formState.event"
              placeholder="例如 pay_success"
            />
          </FormItem>
        </section>
        <section class="dc-editor-section">
          <h3>字段映射</h3>
          <p class="dc-editor-hint">
            取值来源可以是日志自带列（time、actor、server 等），也可以是业务字段
            data.字段名，多层用点连接，例如
            data.order.amount。字段决定结果列和可用的查询条件。
          </p>
          <FieldMappingEditor v-model="formState.fields" />
        </section>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.dc-basic-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.dc-editor-form {
  max-height: 65vh;
  padding: 8px 4px 0;
  overflow-y: auto;
}

.dc-editor-section + .dc-editor-section {
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid hsl(var(--border));
}

.dc-editor-hint {
  margin: -8px 0 16px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.dc-editor-section h3 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
}

.dc-editor-form :deep(.ant-empty) {
  margin-block: 12px;
}

@media (max-width: 767px) {
  .dc-basic-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
