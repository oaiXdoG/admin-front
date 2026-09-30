# 用户管理前端接口约定

以下为前端新增调用的接口约定，后端按此实现后即可联调。前端直接发起请求，不探测接口是否已开发。请求失败时显示获取或保存失败。

统一使用 POST、JSON 请求体和现有 Authorization 请求头；响应外层沿用 `{code,message,data}`。`accountId` 为目标用户 ID，项目关联中的角色引用全局角色定义。

## 编辑用户

`POST /api/account/update`

```json
{"accountId":2,"username":"用户名称","password":"新密码"}
```

密码留空时不提交 `password`。成功返回 `{"code":0,"message":"success","data":null}`。

## 获取项目关联

`POST /api/account/project/list`

```json
{"accountId":2}
```

成功响应：

```json
{"code":0,"message":"success","data":[{"projectId":1,"roleId":2}]}
```

无关联时 `data` 返回空数组。前端校验成功响应后回填表单，获取失败时展示“获取项目关联失败”及重试入口。

## 保存项目关联

`POST /api/account/project/update`

```json
{"accountId":2,"memberships":[{"projectId":1,"roleId":2},{"projectId":3,"roleId":2}]}
```

提交完整关联列表；每个项目出现一次，每条关联选择一个已有角色。成功返回 `{"code":0,"message":"success","data":null}`。只有收到业务成功响应，前端才提示保存成功；失败时保留表单内容。
