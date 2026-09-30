import { spawn } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const API_TARGETS: Record<string, string> = {
  '/api/login': 'http://192.168.1.3:9050/api/login',
  '/api/project/list': 'http://192.168.1.3:9050/api/project/list',
  '/api/project/create': 'http://192.168.1.3:9050/api/project/create',
  '/api/project/update': 'http://192.168.1.3:9050/api/project/update',
  '/api/project/close': 'http://192.168.1.3:9050/api/project/close',
  '/api/project/switch': 'http://192.168.1.3:9050/api/project/switch',
  '/api/account/create': 'http://192.168.1.3:9050/api/account/create',
  '/api/account/list': 'http://192.168.1.3:9050/api/account/list',
  '/api/account/update': 'http://192.168.1.3:9050/api/account/update',
  '/api/account/project/list': 'http://192.168.1.3:9050/api/account/project/list',
  '/api/account/project/update': 'http://192.168.1.3:9050/api/account/project/update',
  '/api/menu/list': 'http://192.168.1.3:9050/api/menu/list',
  '/api/menu/create': 'http://192.168.1.3:9050/api/menu/create',
  '/api/menu/update': 'http://192.168.1.3:9050/api/menu/update',
  '/api/menu/remove': 'http://192.168.1.3:9050/api/menu/remove',
  '/api/access/menu': 'http://192.168.1.3:9050/api/access/menu',
  '/api/role/list': 'http://192.168.1.3:9050/api/role/list',
  '/api/role/create': 'http://192.168.1.3:9050/api/role/create',
  '/api/role/update': 'http://192.168.1.3:9050/api/role/update',
  '/api/role/remove': 'http://192.168.1.3:9050/api/role/remove',
  '/api/role/menu/list': 'http://192.168.1.3:9050/api/role/menu/list',
  '/api/role/menu/update': 'http://192.168.1.3:9050/api/role/menu/update',
}

function loginProxy(): Plugin {
  return {
    name: 'login-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        const target = API_TARGETS[path]
        if (!target) {
          next()
          return
        }

        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', () => {
          const args = [
            '--noproxy', '*',
            '-sS',
            '-X', req.method ?? 'POST',
            target,
            '-H', 'Content-Type: application/json',
            '-w', '\n%{http_code}',
            '--data-binary', '@-',
          ]
          const authorization = req.headers.authorization
          if (authorization) {
            args.push('-H', `Authorization: ${authorization}`)
          }
          const curl = spawn('/usr/bin/curl', args)
          curl.stdin.end(Buffer.concat(chunks))

          const out: Buffer[] = []
          const err: Buffer[] = []
          curl.stdout.on('data', (chunk: Buffer) => out.push(chunk))
          curl.stderr.on('data', (chunk: Buffer) => err.push(chunk))
          curl.on('close', (code) => {
            if (code !== 0) {
              res.statusCode = 502
              res.end(Buffer.concat(err).toString() || 'login proxy failed')
              return
            }
            const text = Buffer.concat(out).toString('utf8')
            const matched = text.match(/^(.*)\n(\d{3})$/s)
            const body = matched ? matched[1] : text
            res.statusCode = matched ? Number(matched[2]) : 200
            res.setHeader('Content-Type', 'application/json')
            res.end(body)
          })
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), loginProxy()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
