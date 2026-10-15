# 部署

前端部署在 gz（`111.230.143.165`），由服务器上已有的 nginx 提供，访问地址 `http://111.230.143.165/`。

## 发布

```bash
deploy/deploy.sh        # 默认 SSH 主机 gz
```

脚本做的事：

1. 本机 `pnpm build:antd`（`.env.production` 里 `VITE_COMPRESS=gzip`，同时生成 `.gz` 文件）。
2. 上传到 `/opt/admin-front/releases/<时间>/`，把 `/opt/admin-front/current` 切到新版本，只保留最近 5 个版本。
3. 复制 `deploy/nginx.conf` 到 `/etc/nginx/sites-available/admin-front` 并启用，`nginx -t` 通过后重载。

## nginx

- 作为 80 端口的 `default_server`（按 IP 访问），替换了系统自带的 `default` 站点（只是欢迎页，文件仍在 `sites-available/default`）。`svn.oaixdog.com` 按域名匹配，不受影响。
- `/api/` 反向代理到本机后端 `127.0.0.1:9050`，前端与接口同源，不需要跨域配置。
- `gzip_static` 直接发送构建时生成的 `.gz`；`js/`、`css/`、`jse/` 和 `_app-config-*.js` 带哈希，缓存一年；`index.html` 不缓存，发布后刷新即生效。
- 没有域名和证书，只有 HTTP/1.1。正式使用建议配域名 + HTTPS（同时启用 HTTP/2）。

## 回滚

```bash
ssh gz 'ls -1t /opt/admin-front/releases'
ssh gz 'cd /opt/admin-front && ln -sfn releases/<版本> current.tmp && mv -Tf current.tmp current'
```

切换后无需重载 nginx。
