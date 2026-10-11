<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

import type { Category, Template, TemplateValues } from '../types';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  Select,
  Tag,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { categories } from '../types';
import FieldMappingEditor from './field-mapping-editor.vue';

const props = defineProps<{
  projectId: number;
  templates: Template[];
}>();

const emit = defineEmits<{
  remove: [id: number];
  save: [template: Template];
}>();

const nameRules: Rule[] = [
  { message: '请输入模板名称', required: true, whitespace: true },
];
const categoryRules: Rule[] = [{ required: true }];
const urlRules: Rule[] = [
  { message: '请输入完整接口地址', required: true, whitespace: true },
  {
    validator: (_rule: Rule, value: string) => {
      if (!value?.trim()) return Promise.resolve();
      try {
        const url = new URL(value.trim());
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          return Promise.resolve();
        }
      } catch {
        // 无法解析的地址视为无效
      }
      return Promise.reject(new Error('请输入完整的 HTTP 或 HTTPS 地址'));
    },
  },
];

const editor = ref<'new' | null | Template>(null);
const formRef = ref<FormInstance>();
const formState = ref<TemplateValues>(emptyValues());

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
      { align: 'left', field: 'url', minWidth: 260, title: '查询接口地址' },
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
          const rows = props.templates.filter(
            (item) =>
              item.name.includes(keyword) &&
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

// 模板保存或删除后刷新列表
watch(
  () => props.templates,
  () => gridApi.query(),
);

function emptyValues(): TemplateValues {
  return { category: 'data', fields: [], name: '', url: '' };
}

function open(template: 'new' | Template) {
  if (template === 'new') {
    formState.value = emptyValues();
  } else {
    const { category, fields, name, url } = JSON.parse(
      JSON.stringify(template),
    ) as Template;
    formState.value = { category, fields, name, url };
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
  emit('save', {
    ...values,
    fields: values.fields ?? [],
    id: editor.value === 'new' ? Date.now() : editor.value.id,
    name: values.name.trim(),
    projectId: props.projectId,
    url: values.url.trim(),
  });
  close();
}

function confirmRemove(row: Template) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除「${row.name}」？`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除模板',
    onOk: () => emit('remove', row.id),
  });
}
</script>

<template>
  <div class="h-full">
    <Grid table-title="查询模板">
      <template #toolbar-tools>
        <Button type="primary" @click="open('new')">
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
        <Button size="small" type="link" @click="open(row)">编辑</Button>
        <Button danger size="small" type="link" @click="confirmRemove(row)">
          删除
        </Button>
      </template>
    </Grid>

    <Modal
      :open="editorOpen"
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
          <FormItem label="完整查询接口地址" name="url" :rules="urlRules">
            <Input v-model:value="formState.url" placeholder="https://" />
          </FormItem>
        </section>
        <section class="dc-editor-section">
          <h3>字段映射</h3>
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
