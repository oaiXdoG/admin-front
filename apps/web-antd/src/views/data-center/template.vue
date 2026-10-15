<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';

import type { DataTemplate } from './types';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { BusinessQuery, DataParam, DataSourceRecord } from '#/api/types';
import type {
  FieldMapping,
  SourceOption,
} from '#/components/field-mapping/types';

import { computed, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  AutoComplete,
  Button,
  Empty,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Select,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createDataTemplateApi,
  getDataSourcesApi,
  getDataTemplatesApi,
  getSourceQueriesApi,
  removeDataTemplateApi,
  updateDataTemplateApi,
} from '#/api';
import FieldMappingEditor from '#/components/field-mapping/field-mapping-editor.vue';
import { useProjectStore } from '#/store';

import ParamEditor from './components/param-editor.vue';
import { DATA_PATH_PATTERN, parseDataTemplate, toValueType } from './types';

interface EditorState {
  fields: FieldMapping[];
  name: string;
  params: DataParam[];
  query: string;
  sourceId?: number;
}

const projectStore = useProjectStore();
const { hasAccessByCodes } = useAccess();
const projectId = computed(() => projectStore.currentProjectId as number);

const sources = ref<DataSourceRecord[]>([]);
const queries = ref<BusinessQuery[]>([]);
const loadingQueries = ref(false);
const editing = ref<'new' | DataTemplate | null>(null);
const state = ref<EditorState>(emptyState());
const saving = ref(false);

const sourceOptions = computed(() =>
  sources.value.map((item) => ({ label: item.name, value: item.id })),
);
const queryOptions = computed(() =>
  queries.value.map((item) => ({
    label: item.label ? `${item.name}（${item.label}）` : item.name,
    value: item.name,
  })),
);
const currentQuery = computed(() =>
  queries.value.find((item) => item.name === state.value.query),
);
/** 查询清单里声明的结果字段，作为取值来源的候选 */
const fieldOptions = computed<SourceOption[]>(() =>
  (currentQuery.value?.fields ?? []).map((item) => ({
    label: item.label ? `${item.key}（${item.label}）` : item.key,
    title: item.label,
    type: toValueType(item.type),
    value: item.key,
  })),
);

function emptyState(): EditorState {
  return { fields: [], name: '', params: [], query: '' };
}

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { align: 'left', field: 'name', minWidth: 180, title: '模板名称' },
      { align: 'left', field: 'sourceName', minWidth: 140, title: '数据源' },
      { align: 'left', field: 'query', minWidth: 160, title: '查询名' },
      {
        field: 'params',
        formatter: ({ cellValue }) => `${cellValue.length} 个`,
        title: '参数',
        width: 80,
      },
      {
        field: 'fields',
        formatter: ({ cellValue }) => `${cellValue.length} 个`,
        title: '结果字段',
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
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async () => {
          const { list } = await getDataTemplatesApi(projectId.value);
          const rows = list.map(parseDataTemplate);
          return { items: rows, total: rows.length };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<DataTemplate>,
});

async function open(template: 'new' | DataTemplate) {
  queries.value = [];
  state.value =
    template === 'new'
      ? { ...emptyState(), sourceId: sources.value[0]?.id }
      : (JSON.parse(JSON.stringify(template)) as EditorState);
  editing.value = template;
  if (state.value.sourceId) await loadQueries(false);
}

/** 读取数据源的查询清单；失败时可以手动填写 */
async function loadQueries(notify = true) {
  if (!state.value.sourceId) {
    message.warning('请先选择数据源');
    return;
  }
  loadingQueries.value = true;
  try {
    queries.value = (
      await getSourceQueriesApi(projectId.value, state.value.sourceId)
    ).queries;
    if (notify) message.success(`读取到 ${queries.value.length} 个查询`);
  } catch {
    queries.value = [];
  } finally {
    loadingQueries.value = false;
  }
}

/** 选中清单里的查询：带出名称、参数和结果字段（已经填写过的不覆盖） */
function applyQuery(name: unknown) {
  const query = queries.value.find((item) => item.name === name);
  if (!query) return;
  state.value.name ||= query.label ?? query.name;
  if (state.value.params.length === 0) {
    state.value.params = (query.params ?? []).map((param) => ({
      label: param.label || param.name,
      name: param.name,
      options: param.options,
      required: !!param.required,
      type: param.type ?? 'string',
    }));
  }
  if (state.value.fields.length === 0) {
    state.value.fields = (query.fields ?? []).map((field) => ({
      key: field.key.replaceAll(/\W/g, '_'),
      label: field.label || field.key,
      source: field.key,
      type: toValueType(field.type),
    }));
  }
}

function validParams() {
  const names = new Set<string>();
  for (const param of state.value.params) {
    if (!/^[A-Z_]\w{0,63}$/i.test(param.name) || names.has(param.name)) {
      message.error('参数名只能是字母、数字、下划线，且不能重复');
      return false;
    }
    if (!param.label.trim()) {
      message.error(`请填写参数「${param.name}」的显示名`);
      return false;
    }
    if (param.type === 'select' && !param.options?.length) {
      message.error(`下拉参数「${param.label}」至少需要一个选项`);
      return false;
    }
    names.add(param.name);
  }
  return true;
}

const formRef = ref<FormInstance>();

async function submit() {
  if (!editing.value) return;
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (!state.value.sourceId || !validParams()) return;
  if (state.value.fields.length === 0) {
    message.error('请至少添加一个结果字段');
    return;
  }
  const data = {
    fields: JSON.stringify(
      state.value.fields.map((field) => ({
        ...field,
        key: field.key.trim(),
        label: field.label.trim(),
        source: field.source.trim(),
      })),
    ),
    name: state.value.name.trim(),
    params: JSON.stringify(
      state.value.params.map((param) => ({
        ...param,
        label: param.label.trim(),
        name: param.name.trim(),
        options: param.type === 'select' ? param.options : undefined,
      })),
    ),
    query: state.value.query.trim(),
    sourceId: state.value.sourceId,
  };
  saving.value = true;
  try {
    await (editing.value === 'new'
      ? createDataTemplateApi(projectId.value, data)
      : updateDataTemplateApi(projectId.value, editing.value.id, data));
    message.success('查询模板已保存');
    editing.value = null;
    await gridApi.query();
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

function remove(row: DataTemplate) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除查询模板「${row.name}」？`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除查询模板',
    async onOk() {
      await removeDataTemplateApi(projectId.value, row.id);
      message.success('查询模板已删除');
      await gridApi.query();
    },
  });
}

onMounted(async () => {
  sources.value = (await getDataSourcesApi(projectId.value)).list;
});
</script>

<template>
  <Page auto-content-height>
    <Grid
      v-if="projectStore.currentProjectId !== null"
      :key="projectStore.currentProjectId"
      table-title="数据查询模板"
    >
      <template #toolbar-tools>
        <Button
          v-if="hasAccessByCodes(['data_template:create'])"
          :disabled="sources.length === 0"
          type="primary"
          @click="open('new')"
        >
          <template #icon>
            <IconifyIcon class="size-4" icon="lucide:plus" />
          </template>
          新增模板
        </Button>
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
          @click="remove(row)"
        >
          删除
        </Button>
      </template>
      <template #empty>
        <Empty
          :description="
            sources.length === 0 ? '请先在「数据源」里添加数据源' : '暂无模板'
          "
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </template>
    </Grid>

    <Modal
      :confirm-loading="saving"
      :open="editing !== null"
      :title="editing === 'new' ? '新增查询模板' : '编辑查询模板'"
      :width="1100"
      cancel-text="取消"
      destroy-on-close
      ok-text="保存"
      @cancel="editing = null"
      @ok="submit"
    >
      <Form
        ref="formRef"
        :model="state"
        :required-mark="false"
        class="dc-editor"
        layout="vertical"
      >
        <section class="dc-section">
          <h3>基本信息</h3>
          <div class="dc-grid3">
            <FormItem
              :rules="[{ required: true, message: '请选择数据源' }]"
              label="数据源"
              name="sourceId"
            >
              <Select
                v-model:value="state.sourceId"
                :options="sourceOptions"
                @change="queries = []"
              />
            </FormItem>
            <FormItem
              :rules="[
                { required: true, message: '请输入查询名' },
                {
                  pattern: /^[A-Z][\w.-]{0,63}$/i,
                  message: '字母开头，字母、数字和 _.-',
                },
              ]"
              extra="业务服务器里查询的名字，从清单选择会自动带出参数和结果字段"
              label="查询名"
              name="query"
            >
              <div class="flex gap-2">
                <AutoComplete
                  v-model:value="state.query"
                  :options="queryOptions"
                  class="flex-1"
                  placeholder="例如 player_info"
                  @select="applyQuery"
                />
                <Button :loading="loadingQueries" @click="loadQueries()">
                  读取清单
                </Button>
              </div>
            </FormItem>
            <FormItem
              :rules="[
                { required: true, whitespace: true, message: '请输入模板名称' },
              ]"
              label="模板名称"
              name="name"
            >
              <Input v-model:value="state.name" placeholder="例如 玩家信息" />
            </FormItem>
          </div>
          <p v-if="currentQuery?.description" class="dc-hint">
            {{ currentQuery.description }}
          </p>
        </section>
        <section class="dc-section">
          <h3>查询参数</h3>
          <p class="dc-hint">
            使用者在数据查询页面按这里的定义填写参数，原样发给业务服务器；模板里没有定义的参数不会发送。
          </p>
          <ParamEditor v-model="state.params" />
        </section>
        <section class="dc-section">
          <h3>结果字段</h3>
          <p class="dc-hint">
            取值来源是业务服务器返回的每一行里的字段名，嵌套字段用点连接，例如
            profile.level。
          </p>
          <FieldMappingEditor
            v-model="state.fields"
            :source-options="fieldOptions"
            :source-pattern="DATA_PATH_PATTERN"
            source-hint="字段名或用点连接的路径，例如 profile.level"
            source-placeholder="例如 nickname"
          />
        </section>
      </Form>
    </Modal>
  </Page>
</template>

<style scoped>
.dc-editor {
  max-height: 68vh;
  padding: 8px 4px 0;
  overflow-y: auto;
}

.dc-grid3 {
  display: grid;
  grid-template-columns: 1fr 1.6fr 1fr;
  gap: 20px;
}

.dc-section + .dc-section {
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid hsl(var(--border));
}

.dc-section h3 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
}

.dc-hint {
  margin: -8px 0 16px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}
</style>
