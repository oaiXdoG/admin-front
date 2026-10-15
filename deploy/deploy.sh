#!/usr/bin/env bash
# 本机执行：构建生产包（.env.production 开启了预压缩 gzip），上传到服务器新版本目录，切换 current 链接并重载 nginx。
# 保留最近 5 个版本，回滚见 deploy/README.md。用法：deploy/deploy.sh [SSH 主机，默认 gz]
set -euo pipefail

HOST="${1:-gz}"
RELEASE="$(date +%Y%m%d-%H%M%S)"
cd "$(dirname "$0")/.."

pnpm build:antd
DIST=apps/web-antd/dist

ssh "$HOST" "mkdir -p /opt/admin-front/releases/$RELEASE"
rsync -az --delete "$DIST"/ "$HOST":/opt/admin-front/releases/"$RELEASE"/
rsync -az deploy/nginx.conf "$HOST":/etc/nginx/sites-available/admin-front
ssh "$HOST" "set -e
cd /opt/admin-front
ln -sfn releases/$RELEASE current.tmp && mv -Tf current.tmp current
ln -sfn /etc/nginx/sites-available/admin-front /etc/nginx/sites-enabled/admin-front
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ls -1t releases | tail -n +6 | xargs -r -I{} rm -rf releases/{}
echo \"current -> \$(readlink current)\""
