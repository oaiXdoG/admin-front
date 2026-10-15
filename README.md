# admin-front

项目运营管理后台，基于 [Vben Admin 5](https://github.com/vbenjs/vue-vben-admin)（Vue 3 + Ant Design Vue）。
仓库是 vben 的 monorepo，只保留了 `apps/web-antd` 一个应用，业务代码都在这里面。

## 开发

需要 Node 22.18+ / 24.12+，pnpm 11（仓库 `packageManager` 已指定，pnpm 会自动切换版本）。

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build:antd   # 产物在 apps/web-antd/dist
```

开发时 `/api` 开头的请求由 vite 代理到后端，后端地址在 `apps/web-antd/.env.development` 的
`API_PROXY_TARGET` 配置（默认 `http://localhost:9050`），本机不同可写到 `.env.development.local` 覆盖。

## 和 vben 默认实现不同的地方

- **接口**：后端统一返回 `{ code, message, data }`，`code === 0` 成功；所有接口都是 POST。
  `100003` 登录失效直接退出，`100027` 项目不一致会以服务器为准重新同步项目和菜单
  （`src/api/request.ts`）。
- **登录**：后端没有用户信息和刷新 token 接口。登录返回的账号信息存在 localStorage，
  刷新页面后从那里恢复；退出时调用 `/api/logout` 删除服务器会话（`src/store/auth.ts`）。
- **当前项目**：右上角切换项目，当前项目保存在服务器的登录会话里，多个标签页互不影响。
  切换后重新拉菜单、重建路由、刷新当前页（`src/store/project.ts`）。
- **菜单**：`accessMode: 'backend'`。`/api/access/menu` 返回平铺菜单，前端按
  `src/router/registry.ts` 的注册表转换成路由（`src/router/access.ts`），未注册的菜单会被忽略。

## 权限模型

后端设计见 `admin-background/docs/permission-redesign.md`，简述：

| 角色类型 | 管理位置 | 说明 |
| --- | --- | --- |
| 平台角色 | 系统管理 → 角色管理 | 只能分配平台菜单（系统管理），通过「用户管理 → 平台角色」分配给账号 |
| 角色模板 | 系统管理 → 角色模板 | 带一套默认的项目菜单，新建项目或「从模板导入」时复制到项目 |
| 项目角色 | 项目设置 → 角色管理 | 属于当前项目，各项目独立维护；通过「成员管理」或「用户管理 → 关联项目」分配 |

菜单分平台和项目两种范围，只在顶级目录选择，子项跟随上级。菜单类型有目录、菜单和按钮：按钮挂在菜单下，路由名称一栏保存权限标识（如 `manage_user:create`），后端写接口按它校验，前端从 `/api/access/menu` 返回的按钮得到权限码（vben `accessCodes`），页面用 `useAccess().hasAccessByCodes([...])` 决定是否显示按钮。超级管理员可以进入所有项目，并在项目里拥有全部项目菜单。
账号只能在「系统管理 → 用户管理」创建，项目管理员在「成员管理」里按登录名把已有账号拉进项目。

每个账号可以在右上角头像菜单的「个人设置」里修改昵称、头像和密码。「系统管理 → 系统设置」分「品牌信息 / 日志保留期 / 数据备份」三个标签页（`views/system/setting`，当前标签记在地址栏 `?tab=`）。系统名称、Logo、浏览器图标、登录页文字和版权方在「品牌信息」里统一配置（图片压缩后以 base64 存进数据库），启动时读取并应用（`src/store/setting.ts`）。

## 新增一个页面

1. 在 `src/views/` 下写页面组件。
2. 在 `src/router/registry.ts` 注册：路由名 `目录_页面`、路径 `/目录/页面`、`component` 指向页面文件。
3. 在「系统管理 → 菜单管理」里新增菜单（可直接选「已注册路由」自动填入），再给角色分配：系统管理类页面分配给平台角色，项目内的页面分配给角色模板或各项目的项目角色。
4. 页面里有写操作时：后端接口用 `页面路由名称:操作` 校验，菜单管理里在该页面下「新增按钮」填同样的权限标识，前端用 `hasAccessByCodes` 控制按钮显示。

**样式注意**：不要把 Tailwind 的外边距类（`mt-*`、`mb-*`、`ml-*` 等）直接写在 Ant Design 组件（`Card`、`Alert`、`Form`、`Tag`、`Descriptions` 等）上，组件自带的样式会把它覆盖掉；在外面套一个 `div`（或行内用 `span`）加间距，多个卡片之间用 `Page` 的 `content-class="flex flex-col gap-4"`。

字段映射编辑器（结果字段 + JSON 子字段）在 `src/components/field-mapping/`，数据查询模板使用。

标准的列表页参考 `src/views/system/role`：`useVbenVxeGrid` 做查询表格，`useVbenModal` + `useVbenForm`
做新增/编辑弹窗，字段配置写在同目录的 `data.ts`。

## 目录

```
apps/web-antd/src
├── api/            接口（types.ts 是后端数据结构）
├── layouts/        布局，右上角项目切换、新建项目弹窗
├── router/         路由注册表、菜单转路由、路由守卫
├── store/          登录、当前项目
└── views/
    ├── system/       项目 / 用户 / 角色 / 角色模板 / 菜单管理
    ├── project/      项目设置：成员管理、项目角色
    ├── log-center/   日志中心：日志查询、事件管理（事件字典）、日志源（log-sdk 写入的 ClickHouse 日志，日志源按项目配置）
    ├── data-center/  数据中心：数据查询、查询模板、数据源（调用业务服务器的查询接口，接口规范见 admin-background docs/data-center.md）
    └── server/       性能监控、运维操作（前端原型，暂无接口）
```
