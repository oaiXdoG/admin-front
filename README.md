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
- **登录**：后端没有用户信息、刷新 token、退出接口。登录返回的账号信息存在 localStorage，
  刷新页面后从那里恢复（`src/store/auth.ts`）。
- **当前项目**：右上角切换项目。菜单权限按项目返回，切换后重新拉菜单、重建路由、刷新当前页，
  当前页在新项目下没有权限时回到首页（`src/store/project.ts`）。
  有项目管理权限但一个项目都没有时，会强制弹出新建项目。
- **菜单**：`accessMode: 'backend'`。`/api/access/menu` 返回平铺菜单，前端按
  `src/router/registry.ts` 的注册表转换成路由（`src/router/access.ts`），未注册的菜单会被忽略。

## 新增一个页面

1. 在 `src/views/` 下写页面组件。
2. 在 `src/router/registry.ts` 注册：路由名 `目录_页面`、路径 `/目录/页面`、`component` 指向页面文件。
3. 在「系统管理 → 菜单管理」里新增菜单（可直接选「已注册路由」自动填入），再到「角色管理」给角色分配。

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
    ├── system/       项目 / 用户 / 角色 / 菜单管理
    ├── data-center/  数据查询、日志查询、查询模板（前端原型，暂无接口）
    └── server/       性能监控、运维操作（前端原型，暂无接口）
```
