<script lang="ts" setup>
import type {
  JvmTemplateRecord,
  ProcessRecord,
  ProcessWrite,
  ServerRecord,
} from '#/api/types';

import { computed, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Collapse,
  CollapsePanel,
  Input,
  message,
  Modal,
} from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/form';
import { createProcessApi, updateProcessApi } from '#/api';

/** 新增或编辑托管进程；record 为 null 时新建 */
const props = defineProps<{
  open: boolean;
  projectId: number;
  record: null | ProcessRecord;
  servers: ServerRecord[];
  templates: JvmTemplateRecord[];
}>();
const emit = defineEmits<{ close: []; saved: [] }>();

interface FormValues extends ProcessWrite {
  launchMode: 'classpath' | 'jar';
  name: string;
  serverId: number;
}

const saving = ref(false);
const importText = ref('');
const preview = ref('');

const PATH = /^\/[^\s"'\\%;]*$/;
const FILE = /^[^\s"'\\%;]+$/;

const [ProcessForm, formApi] = useVbenForm({
  handleValuesChange: (values: FormValues) => {
    preview.value = commandLine(values);
  },
  schema: [
    {
      component: 'Select',
      componentProps: () => ({
        disabled: props.record !== null,
        options: props.servers.map((item) => ({
          label: item.groupName ? `${item.name}（${item.groupName}）` : item.name,
          value: item.id,
        })),
        placeholder: '选择服务器',
      }),
      fieldName: 'serverId',
      label: '服务器',
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: () => ({
        disabled: props.record !== null,
        maxlength: 48,
        placeholder: '例如 game-1',
      }),
      fieldName: 'name',
      help: '同一服务器内唯一，创建后不能修改；systemd 服务名为 adm-进程名',
      label: '进程名',
      rules: z
        .string()
        .regex(/^[a-z][a-z0-9-]{0,47}$/, { message: '小写字母开头，小写字母、数字和 -' }),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128, placeholder: '可空，例如 一区游戏服' },
      fieldName: 'remark',
      label: '备注',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '例如 /data/game-1' },
      fieldName: 'workDir',
      label: '工作目录',
      rules: z.string().trim().regex(PATH, { message: '绝对路径，不能有空格和引号' }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: 'java' },
      defaultValue: 'java',
      fieldName: 'javaPath',
      help: '默认按 PATH 查找；不同进程可以用不同 JDK，例如 /usr/lib/jvm/java-21/bin/java',
      label: 'Java',
      rules: z.string().trim().regex(FILE, { message: '不能有空格和引号' }),
    },
    {
      component: 'Select',
      componentProps: () => ({
        allowClear: true,
        options: props.templates.map((item) => ({ label: item.name, value: item.id })),
        placeholder: '不使用模板',
      }),
      fieldName: 'templateId',
      help: '模板参数在前，下面的 JVM 参数在后（同名参数后者生效）',
      label: 'JVM 模板',
    },
    {
      component: 'Textarea',
      componentProps: {
        autoSize: { maxRows: 8, minRows: 3 },
        placeholder: '-Xms2g\n-Xmx2g\n-XX:+UseG1GC',
      },
      fieldName: 'jvmOptions',
      help: '一行一个，也可以写在一行里',
      label: 'JVM 参数',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: [
          { label: '-jar 启动 jar', value: 'jar' },
          { label: '-cp 类路径 + 主类', value: 'classpath' },
        ],
      },
      defaultValue: 'jar',
      fieldName: 'launchMode',
      label: '启动方式',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '例如 game.jar' },
      dependencies: {
        if: (values) => values.launchMode !== 'classpath',
        triggerFields: ['launchMode'],
      },
      fieldName: 'jar',
      help: '相对工作目录或绝对路径',
      label: '启动 jar',
      rules: z.string().trim().regex(FILE, { message: '不能有空格和引号' }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: '例如 conf:lib/*:loginServer-1.0-SNAPSHOT.jar' },
      dependencies: {
        if: (values) => values.launchMode === 'classpath',
        triggerFields: ['launchMode'],
      },
      fieldName: 'classpath',
      help: '冒号分隔，相对工作目录；lib/* 不用加引号，由 java 自己展开',
      label: '类路径',
      rules: z.string().trim().regex(FILE, { message: '不能有空格和引号' }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: '例如 com.oaixdog.loginserver.Application' },
      dependencies: {
        if: (values) => values.launchMode === 'classpath',
        triggerFields: ['launchMode'],
      },
      fieldName: 'mainClass',
      label: '主类',
      rules: z
        .string()
        .trim()
        .regex(/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/, { message: '完整类名，例如 com.example.Application' }),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 1024, placeholder: '可空，例如 --server.id=1' },
      fieldName: 'programArgs',
      label: '程序参数',
    },
    {
      component: 'Textarea',
      componentProps: { autoSize: { maxRows: 6, minRows: 2 }, placeholder: 'TZ=Asia/Shanghai' },
      fieldName: 'env',
      help: '每行一个 KEY=VALUE，可空',
      label: '环境变量',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '空为 root，建议用普通用户，例如 game' },
      fieldName: 'runUser',
      label: '运行用户',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', max: 65_535, min: 0, precision: 0 },
      defaultValue: 0,
      fieldName: 'port',
      help: '启动后确认这个端口可以连接才算成功，0 表示不检查',
      label: '检查端口',
    },
  ],
  showDefaultActions: false,
});

const templateOptions = computed(
  () => new Map(props.templates.map((item) => [item.id, item.options])),
);

function lines(text?: null | string) {
  return (text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function commandLine(values: Partial<FormValues>) {
  const parts = [
    values.javaPath || 'java',
    ...lines(values.templateId ? templateOptions.value.get(values.templateId) : ''),
    ...lines(values.jvmOptions),
    ...(values.launchMode === 'classpath'
      ? ['-cp', values.classpath || '<类路径>', values.mainClass || '<主类>']
      : ['-jar', values.jar || '<jar>']),
  ];
  if (values.programArgs?.trim()) parts.push(values.programArgs.trim());
  return parts.join(' ');
}

/** 按空白拆分，引号里的空白不拆 */
function tokenize(text: string) {
  return text.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
}

/** 从 start.sh 里的启动命令拆出 Java、JVM 参数、启动目标（-jar 或 -cp + 主类）和程序参数，去掉 nohup、后台运行和输出重定向 */
async function importCommand() {
  const tokens: string[] = [];
  const raw = tokenize(importText.value.replaceAll('\\\n', ' '));
  for (let index = 0; index < raw.length; index++) {
    const token = raw[index] as string;
    if (token === '&' || token === 'nohup') continue;
    // 单独的重定向符号连同后面的目标一起去掉；2>&1、>out.log 这类只去掉自己
    if (/^[\d&]?(?:>>?|<)$/.test(token)) {
      index++;
      continue;
    }
    if (/^[\d&]?(?:>>?|<)/.test(token)) continue;
    tokens.push(token);
  }
  const unquote = (token = '') => token.replaceAll(/["']/g, '');
  const javaIndex = tokens.findIndex((token) => /(?:^|\/)java"?$/.test(token));
  const targetIndex = tokens.findIndex((token, index) => index > javaIndex && ['-classpath', '-cp', '-jar'].includes(token));
  const classpathMode = tokens[targetIndex] !== '-jar';
  const valid = javaIndex >= 0 && targetIndex > javaIndex && tokens[targetIndex + 1] && (!classpathMode || tokens[targetIndex + 2]);
  if (!valid) {
    message.warning('没有识别到「java ... -jar xxx.jar」或「java ... -cp 类路径 主类」');
    return;
  }
  const args = tokens.slice(targetIndex + (classpathMode ? 3 : 2));
  await formApi.setValues({
    classpath: classpathMode ? unquote(tokens[targetIndex + 1]) : '',
    jar: classpathMode ? '' : unquote(tokens[targetIndex + 1]),
    javaPath: unquote(tokens[javaIndex]),
    jvmOptions: tokens.slice(javaIndex + 1, targetIndex).join('\n'),
    launchMode: classpathMode ? 'classpath' : 'jar',
    mainClass: classpathMode ? unquote(tokens[targetIndex + 2]) : '',
    programArgs: args.join(' '),
  });
  message.success('已填入 Java、JVM 参数、启动方式和程序参数，请检查');
}

async function save() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const values = await formApi.getValues<FormValues>();
  const data: ProcessWrite = {
    env: values.env ?? '',
    classpath: values.launchMode === 'classpath' ? (values.classpath ?? '').trim() : '',
    jar: values.launchMode === 'classpath' ? '' : (values.jar ?? '').trim(),
    mainClass: values.launchMode === 'classpath' ? (values.mainClass ?? '').trim() : '',
    javaPath: values.javaPath?.trim() || 'java',
    jvmOptions: values.jvmOptions ?? '',
    port: values.port ?? 0,
    programArgs: values.programArgs?.trim() ?? '',
    remark: values.remark?.trim() ?? '',
    runUser: values.runUser?.trim() ?? '',
    templateId: values.templateId ?? null,
    workDir: values.workDir.trim(),
  };
  saving.value = true;
  try {
    await (props.record
      ? updateProcessApi(props.projectId, props.record.id, data)
      : createProcessApi(props.projectId, values.serverId, values.name, data));
    message.success(
      props.record && props.record.state === 'active'
        ? '已保存，重启后生效'
        : '进程已保存',
    );
    emit('saved');
  } catch {
    // 错误信息已由请求拦截器提示
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    importText.value = '';
    await formApi.resetForm();
    const record = props.record;
    if (record) {
      await formApi.setValues({
        env: record.env,
        classpath: record.classpath,
        jar: record.jar,
        launchMode: record.mainClass ? 'classpath' : 'jar',
        mainClass: record.mainClass,
        javaPath: record.javaPath,
        jvmOptions: record.jvmOptions,
        name: record.name,
        port: record.port,
        programArgs: record.programArgs,
        remark: record.remark,
        runUser: record.runUser,
        serverId: record.serverId,
        templateId: record.templateId ?? undefined,
        workDir: record.workDir,
      });
    }
    preview.value = commandLine(await formApi.getValues<FormValues>());
  },
);
</script>

<template>
  <Modal
    :confirm-loading="saving"
    :open="open"
    :title="record ? `编辑进程：${record.name}` : '新增进程'"
    :width="760"
    cancel-text="取消"
    destroy-on-close
    ok-text="保存"
    @cancel="emit('close')"
    @ok="save"
  >
    <div class="mb-4">
      <Collapse ghost>
        <CollapsePanel key="import" header="从现有启动命令导入（可选）">
          <Input.TextArea
            v-model:value="importText"
            :auto-size="{ minRows: 2, maxRows: 5 }"
            placeholder="粘贴 start.sh 里的那行，例如 nohup java -Xmx2g -cp &quot;conf:lib/*&quot; com.example.Application > /dev/null 2>&1 &"
          />
          <div class="mt-2 text-right">
            <Button size="small" @click="importCommand">识别并填入</Button>
          </div>
        </CollapsePanel>
      </Collapse>
    </div>
    <ProcessForm />
    <div class="mt-2">
      <Alert type="info">
        <template #message>
          <div class="text-muted-foreground mb-1 text-xs">实际启动命令（systemd ExecStart）</div>
          <div class="break-all font-mono text-xs">{{ preview }}</div>
        </template>
      </Alert>
    </div>
  </Modal>
</template>
