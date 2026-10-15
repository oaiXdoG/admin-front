# 工作总结与交接

更新时间：2026-10-14（数据中心、按钮权限、操作日志已完成，后端已部署到 gz 并联调通过）。供新对话接续工作使用。

## 一、三个仓库

| 仓库 | 路径 | 说明 | 远程 | 最新提交 |
| --- | --- | --- | --- | --- |
| admin-front | `/Users/oaixdog/Projecet/admin-front` | 管理后台前端，vben-admin 5（Vue 3 + Ant Design Vue），只保留 `apps/web-antd` | GitHub `oaiXdoG/admin-front`，已推送 | `d0b0a6b`（功能提交，之后只有本文档的更新） |
| admin-background | `/Users/oaixdog/Projecet/admin-background` | 管理后台后端，Java 21 + zfoo 4.1.4 + MyBatis-Plus + PostgreSQL + Redis | GitHub `oaiXdoG/admin-background`，已推送 | `7f3f69b` |
| log-sdk | `/Users/oaixdog/Projecet/log-sdk` | 日志上报 SDK + ClickHouse / Vector 部署配置 | GitHub `oaiXdoG/log-sdk`，已推送 | `3983f2b` |

约定：直接在 `main` 上开发，不建功能分支；只有用户明确要求时才提交、推送。admin-background 和 log-sdk 遵守各自 `docs/development-guidelines.md`（没有要求时不写测试、不随意编译；接口变化同步改文档）。用户偏好：优先用成熟方案（vben 内置组件、Logback 等），不重复造轮子。

## 二、已完成

### 1. 前端迁移到 vben-admin
- React + antd 项目整体替换为 vben-admin 5 的 `web-antd`；旧 React 代码备份在 `/Users/oaixdog/Projecet/admin-front-backup-20261011`。
- 所有表格统一使用 vben 的 `useVbenVxeGrid`，表单 `useVbenForm`，弹窗 `useVbenModal`。
- 菜单由后端返回，前端按 `apps/web-antd/src/router/registry.ts` 注册表转成路由；新增页面流程见根目录 `README.md`。
- 去掉了 vben 自带的 lefthook / commitlint 提交钩子。

### 2. 权限模型：平台角色 / 角色模板 / 项目角色
完整设计：admin-background `docs/permission-redesign.md`、`docs/permission-flow.md`。

- 平台角色（`role_type=1`）：只能分配平台菜单（系统管理），通过 `account_role` 分配。内置「超级管理员」可进入所有项目并拥有项目内全部权限，不需要成为成员。
- 角色模板（`role_type=2`）：平台维护，新建项目或「从模板导入」时**复制**为项目角色，复制后互不影响。
- 项目角色（`role_type=3`）：属于某个项目，各项目独立维护，通过 `project_user` 分配。
- 菜单 `scope`：1 平台、2 项目，只在顶级目录选择，子项跟随上级。
- 当前项目保存在登录会话（Redis `login:project:<token>`），多标签页互不影响；`account.last_project_id` 只作为下次登录默认项目。
- 密码 bcrypt；账号可禁用；禁用、重置密码时该账号会话失效；有退出登录接口。
- 账号只由平台创建；项目管理员在「项目设置 → 成员管理」按登录名拉人。

### 3. 系统管理各模块
- 菜单管理：菜单 ID 由服务器生成，顶级目录 10000、20000……，子孙在段内自增（10001…），每段最多 9999；页面不再显示 ID。
- 角色管理 / 角色模板 / 项目角色：共用一个页面组件 `views/system/role/components/role-page.vue`；分配菜单时父目录必须一起提交。
- 用户管理：状态开关、平台角色、按项目选择项目角色的关联。
- 项目管理：管理列表含已关闭项目和成员数，可重新启用，新建时可勾选初始角色模板。
- 个人设置（头像下拉进入，路由 `/profile`）：昵称、头像、备注、修改密码（需原密码，其他会话失效）、我的权限。
- 系统设置（`manage_setting`）：系统名称、Logo、浏览器图标、登录页标题/描述、版权方；不登录也可读取，启动时应用。
- 图片（头像、Logo、图标）在浏览器压缩后以 base64 data URL 存数据库，上限约 200KB。

### 4. 初始化
见 admin-background `docs/initialization.md`：执行 `src/main/resources/db/schema.sql` 后启动服务，`SystemInitializationService` 创建超级管理员角色；账号表为空时创建初始管理员 `admin`，密码取 `admin.init.password`，未配置则随机生成并打印到启动日志（WARN）。

### 5. 日志系统（进行中）
设计：admin-background `docs/log-service-design.md`（第三版）。

```
业务服务（log-sdk）→ 本地文件 → Vector → ClickHouse ← admin 后台数据中心（待开发）
```

- 已完成第 1 步：gz 上部署 ClickHouse 25.8，容器 `clickhouse-log`，HTTP 端口 `38123`，内存上限 1.5GB，库 `logs_test`（内网）/ `logs_prod`（正式），账号 `logs_admin`、`writer_test/prod`、`reader_test/prod`。普通日志 90 天 TTL，`retention='permanent'`（支付类）永久保留。
- 已完成第 2 步：log-sdk（`LogReporter.init(LogSdkConfig)` 启动时一次，`LogReporter.event(...).permanent().actor(..).put(..).send()`），写文件用独立 Logback `LoggerContext`（注意 Logback 1.5 需要 `setMDCAdapter`）；Vector 配置 `deploy/vector/vector.yaml`。已端到端验证：约 3 秒可查、断点续传不重复、坏行丢弃。
- 已确定的决策：App Key 项目创建后不可修改；不需要消息队列和独立日志服务；admin 通过「系统设置 → 日志存储」配置 ClickHouse 连接（方案 B，密码加密存储，页面显示当前连接的库）。
- 第 3、4 步（2026-10-14，已联调）：接口见 admin-background `docs/data-center.md`。
  - 后端用 ClickHouse 官方 HTTP 接口 + 查询参数（`ClickHouseClient`），不引入 JDBC 驱动；密码用 `security.secret-key` AES-GCM 加密存 `system_setting` 的 `logStorage.*`。
  - 查询模板存 PostgreSQL 表 `query_template`（一个模板对应一个事件，字段映射 JSON 原样保存）；查询强制当前项目 App Key、时间范围必填、条件全部参数化。
  - 项目 App Key 编辑时只读，后端拒绝修改（`100040`）。
  - 前端：系统设置新增「日志存储」卡片（测试连接、保存、修改保留期）；数据中心三个页面接入接口，去掉了本地 store。

### 6. 按钮级权限（2026-10-14，已联调）
- 菜单类型 3 为按钮，挂在菜单下，`route_name` 存权限标识 `页面路由名称:操作`；预置按钮为内置，见 `schema.sql`，清单见 admin-background `docs/permission-flow.md`。
- 后端写接口改为校验按钮（`requirePlatformMenu` / `requireProjectMenu` 传权限标识），查看类接口仍校验页面。
- 前端 `router/access.ts` 把按钮写入 vben `accessCodes`，各页面用 `useAccess().hasAccessByCodes` 控制按钮显示；角色「分配菜单」树改为父子独立勾选（勾选带上级和下级，取消带下级），以便只分配页面不分配按钮。
- 操作日志：admin-background **不使用 log-sdk**，登录、退出和所有写操作直接写 PostgreSQL 表 `operation_log`（密码、图片脱敏），平台页面「系统管理 → 操作日志」（`manage_operation_log`，`/manage/operation-log`）查询。系统设置里的「日志存储」只用来读取外部业务服务写入 ClickHouse 的日志，与后台自己的日志无关。表结构见 `schema.sql`，说明见 admin-background `docs/data-center.md` 第四节。
- 现有数据库已执行一次性升级脚本 `admin-background/.ops/upgrade-2026-10-14.sql`（建 `query_template`、插入 32 个按钮、已有页面的角色获得页面下全部按钮、新增操作日志菜单 10028）、`.ops/upgrade-operation-log.sql`（建 `operation_log`）、`.ops/upgrade-backup.sql`、`.ops/upgrade-data-center.sql`、`.ops/upgrade-split-center.sql`（日志中心/数据中心拆分）。`.ops/` 是本地忽略目录（`.git/info/exclude`），放一次性脚本，不提交。
- 联调（2026-10-14）：对 gz 上的后端跑了 56 项接口检查（日志存储、模板、各类查询条件、注入、分页、按钮权限、无权限账号、App Key、操作日志脱敏与筛选），全部通过；临时账号和测试数据已清理。脚本在 `admin-background/.ops/`（不提交）。

## 三、环境

| 项 | 值 |
| --- | --- |
| 服务器 gz | `111.230.143.165`（SSH 别名 `gz`，Debian 13，4 核 3.6GB，磁盘余约 64GB） |
| PostgreSQL | gz `:28417`，库 `admin_background` |
| Redis | gz `:41728` |
| ClickHouse | gz `:38123`，账号密码在 `log-sdk/deploy/clickhouse/secrets.env`（不提交） |
| 后端 | **部署在 gz** `:9050`（systemd `admin-background`，见 admin-background `deploy/README.md`，发布用 `deploy/deploy.sh`）；服务器配置 `/opt/admin-background/conf/application.properties` |
| 前端 | **部署在 gz** `http://111.230.143.165/`（nginx 80 端口默认站点，`/api` 代理到 `:9050`，发布用 `deploy/deploy.sh`，见 `deploy/README.md`）；本机调试 `pnpm dev`，`:5173`，`/api` 代理到 `API_PROXY_TARGET`，本机 `apps/web-antd/.env.development.local` 已设为 `http://111.230.143.165:9050`（不提交） |

- 初始管理员：账号 `admin`，密码见 admin-background `target/server.log` 中 `SystemInitializationService` 的 WARN 日志；用户应已在个人设置中修改。
- 数据库当前数据：项目「测试项目」（用户自建），其余为初始化数据。

### 已知坑
- **Clash 系统代理**：macOS 的 Java 启动时会读取系统代理（`socksProxyHost=127.0.0.1:7897`），PostgreSQL 连接会经代理绕行，接口变慢 10～20 倍。启动后端时确保系统代理关闭，或在 Clash 绕过列表加入 `111.230.143.165`，或启动参数加 `-DsocksNonProxyHosts=111.230.143.165`。
- 后端新增了 `spring-security-crypto` 依赖，IDE 启动前需刷新 Maven 依赖。
- vxe 表格会克隆隐藏的固定列表格，浏览器自动化测试定位时要过滤可见元素。
- zfoo 按请求类路由：新增接口需要新建 `@Protocol` 请求类，并在 `conf/protocol.xml` 和 `Application.java` 路由表中注册。

## 四、待办

1. 在浏览器里走一遍新页面（日志存储、数据中心、操作日志、菜单管理里的按钮、角色分配菜单）。
2. gz 的 `9050` 目前对公网开放，后端没有额外的访问控制，建议在腾讯云安全组里限制来源 IP。

### 安全加固（2026-10-14，已部署 gz 并验证）
- 会话 12 小时无操作才失效（每次请求续期）。
- 密码至少 8 位且同时包含字母和数字（前后端一致，前端规则在 `src/utils/password.ts`）。旧密码不受影响。
- 登录失败：同一账号 5 次或同一 IP 20 次，锁定 15 分钟（锁定期间密码正确也不能登录）。手动解锁：删除 Redis 键 `login:fail:account:<登录名小写>`。
- 详见 admin-background `docs/permission-redesign.md` 第五节。

### 数据备份（2026-10-14，已部署 gz 并验证）
- 「系统管理 → 系统设置 → 数据备份」：每天定时备份（当前 03:00，保留 7 份）、立即备份、下载、删除；按钮权限 `manage_setting:backup`。
- 后端 `pg_dump -Fc` 写到 gz `/data/admin-background/backup`，不接对象存储。说明见 admin-background `docs/backup.md`，恢复见 `deploy/README.md`。
- zfoo 的定时方法必须以 `cron` 开头命名，否则启动失败。

### 界面调整（2026-10-14）
- 系统设置改为一张卡片分三个标签页（品牌信息 / 日志保留期 / 数据备份），只渲染当前标签，当前标签记在 `?tab=`。
- 所有页面路由加了 `meta.fullPathKey: false`（`router/access.ts`），页签只按路径区分，查询参数变化不会多开页签。
- Tailwind 外边距类写在 Ant Design 组件上会被覆盖，统一改为外层 `div` 加间距（见 README「样式注意」）。

### 数据中心重构（2026-10-14，已部署 gz 并在浏览器走通）
- 三个页面：日志查询（不需要模板，按事件/玩家/服务器/关键字，点玩家 ID 看轨迹）、数据查询（按模板）、事件与模板（自动列出事件，建模板时从数据读取字段、类型和样例）。
- 详情抽屉（完整 data、跳转玩家轨迹）、导出 CSV（最多 5 万行，按钮 `data_query:export`、`data_log:export`）。模板去掉了「分类」。
- 统计视图（按天/字段分组的计数、求和、去重人数 + 图表）确定留到下一轮。
- 接口见 admin-background `docs/data-center.md`。

### 日志中心 / 数据中心拆分（2026-10-14，已部署 gz 并在浏览器走通）
- **日志中心**（`log_*`，`views/log-center`，接口 `/api/log/*`）：查询 log-sdk 写入 ClickHouse 的日志（后来改为事件字典 + 按项目日志源，见下节）。
- **数据中心**（`data_*`，`views/data-center`，接口 `/api/data/*`）：查询业务服务器自身的数据。
  - 数据源 `data_source`：每个项目配置业务服务器接口地址和签名密钥（加密保存），可测试连接。
  - 查询模板 `data_template`：选数据源和查询名，定义参数和结果字段，可从业务服务器的查询清单自动带出。
  - 数据查询：按参数生成表单，结果按字段成列，详情、导出（最多 5 万行）。
  - 只做「接口」类型数据源，不直连业务数据库；业务服务器按 admin-background `docs/data-center.md` 的规范实现 `/admin/queries`、`/admin/query`（HMAC-SHA256 签名）。
- 联调用的模拟业务服务器在 admin-background `.ops/mock_business.py`（本地忽略目录，不提交）。
- 统计视图（日志按天/字段分组统计）仍留到下一轮。

### 日志中心：事件字典 + 按项目日志源（2026-10-14，已部署 gz 并在浏览器走通）
- 去掉「日志模板」和「模板查询」，改为**事件字典**：表 `log_event`（项目 + 事件名唯一），给事件配中文名、说明和字段说明（`{path,label,type}`），只影响展示；不配置也能查，字段从最近日志自动读取。
- 合并为一个查询页：只选一个事件时结果按字段成列，并可按字段加条件（`data.<路径>`，且/或）；没选单个事件时条件栏显示提示。
- 菜单：日志查询 `log_query`（导出 `log_query:export`）、事件管理 `log_event`（`:update`、`:remove`）、日志源 `log_source`（`:update`）。
- **日志源每个项目一个**：表 `log_source`（`project_id` 唯一），「日志源」页面是一张表单（地址、库名、只读账号、密码，测试连接 / 保存，按钮 `log_source:update`）；查询仍强制本项目 App Key。地址做了 SSRF 检查（拒绝链路本地/组播/通配地址，不跟随跳转）。最初做成了多个日志源，讨论后改为一个：集群对外只有一个入口，正式/测试是两套后台，多个日志源只会让用户不知道该查哪个。
- 平台「系统设置 → 日志保留期」只保留管理账号和保留期（`logStorage.url/database/adminUser/adminPassword`），不再有只读账号。
- 现有库执行了 `.ops/upgrade-log-source.sql`：建 `log_source`、`log_event`，把原平台只读账号复制成项目 1 的「默认」日志源，删除 `log_template` 和旧菜单，插入新菜单按钮。
- 现有库又执行了 `.ops/upgrade-single-source.sql`（每个项目只留一个日志源，去掉 name/sort/remark，删除新建/删除按钮 50007、50009）。
- 联调：`.ops/it_logsource.py` 30 项、`.ops/it_single.py` 全部通过；浏览器走通事件说明编辑、查看日志、字段条件过滤。测试数据和临时账号已清理。
- 接口见 admin-background `docs/log-center.md`，权限见 `docs/permission-flow.md`。
- 条件查询修正：字段不存在/为 null 时不再被当成 0、空文本或 false（原来「金额 < 10」「不等于」会多命中）；不带时区的日期文本按 Asia/Shanghai 解析（ClickHouse 服务器是 UTC，原来差 8 小时）；数字字段接受数字文本。验证数据 `.ops/qa_log.py`（log_id 以 QA 开头，保留在 logs_test 供手工验证，`python3 .ops/qa_log.py clean` 清理），36 个场景见 `docs/log-query-test-cases.md`。

### 前端部署到 gz（2026-10-14）
- `http://111.230.143.165/`：gz 已有的 nginx，新增站点 `admin-front` 作为 80 端口默认站点（替换了自带欢迎页的 `default` 链接），静态文件在 `/opt/admin-front/current`（按版本目录切换，保留 5 个）。
- 构建开启预压缩 gzip（`.env.production` `VITE_COMPRESS=gzip`），nginx `gzip_static`；带哈希的文件缓存一年，`index.html` 不缓存。
- 本机测得：RTT 约 55ms，带宽约 1.2～1.5 MB/s；最大的 vxe-table 包 774KB 压缩后 231KB。
- `svn.oaixdog.com` 外网 443 被腾讯云未备案拦截（与本次无关，8443 正常）。
- 日志字段约定（用户确定）：上报字段**只增不改不删**，新增字段旧数据为空。

### 主播 / 玩家（2026-10-14）
- 业务里有主播和玩家，玩家加入主播的直播间（主播开游戏即一个房间，有断线重连，不区分场次）。
- 决定：不加主播固定列；`actor` 页面上改叫「用户」，主播和玩家都是用户，事件名前缀区分 `anchor_*` / `player_*`；直播间事件统一带 `data.anchorId`（主播自己的事件填自己）。
- 日志查询的字段条件不再要求只选一个事件：多选时可选字段是各事件字段的合集，没有该字段的事件不命中。
- 场景数据 `.ops/qa_room.py`（log_id 以 QAROOM 开头），8 个场景见 `docs/log-query-room-cases.md`，全部通过；前端已发布到 gz。

### 已知坑（新增）
- **Maven 默认用的是 JDK 25**（Homebrew `openjdk`），JDK 23 起不再自动运行 classpath 上的注解处理器，Lombok 失效、报几百个「找不到符号」。编译时指定 JDK 21：`JAVA_HOME=/usr/local/Cellar/openjdk@21/21.0.9/libexec/openjdk.jdk/Contents/Home mvn compile`。
- 本地调试：前端 `pnpm dev`（http://localhost:5173），`/api` 由 vite 代理到 gz 的后端。

ClickHouse `38123` 端口的来源 IP 限制：用户决定不处理。
