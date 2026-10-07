import type { IncomingMessage } from 'node:http'
import { readFile } from 'node:fs/promises'
import type { Plugin } from 'vite'
import { createGuideDemoStore, DemoError } from './guide-demo-store'

async function body(request: IncomingMessage, limit: number) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw new DemoError('内容超出大小限制', 413)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export function guideDemoPlugin(): Plugin {
  const store = createGuideDemoStore()
  return {
    name: 'scenic-guide-local-demo', apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0]
        if (!path.startsWith('/api/') && !path.startsWith('/test/') && !path.startsWith('/__guide-demo/')) return next()
        res.setHeader('Cache-Control', 'no-store')
        const json = (data: unknown, status = 200) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)) }
        try {
          if (req.method === 'GET' && path.startsWith('/__guide-demo/images/')) {
            const image = path === '/__guide-demo/images/reference.jpg'
              ? { bytes: await readFile(new URL('./reference.jpg', import.meta.url)), contentType: 'image/jpeg' }
              : store.image(path)
            if (!image) throw new DemoError('演示图片不存在，请恢复示例或重新选择图片', 404)
            res.setHeader('Content-Type', image.contentType); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(image.bytes); return
          }
          if (req.method === 'GET' && path === '/api/scenic-guide/admin') return json({ success: true, data: store.read() })
          if (req.method === 'PUT' && path === '/api/scenic-guide/admin') {
            const draft = JSON.parse((await body(req, 180 * 1024)).toString())
            return json({ success: true, data: store.save(draft) })
          }
          if (req.method === 'POST' && path === '/__guide-demo/upload') {
            const bytes = await body(req, 10 * 1024 * 1024)
            return json({ imageUrl: store.upload(bytes, req.headers['content-type'] || '') })
          }
          if (req.method === 'POST' && path === '/__guide-demo/reset') { store.reset(); return json({ success: true }) }
          // Fail closed: demo mode never falls through to the production API proxy.
          return json({ success: false, message: '本地演示只开放景区导览功能' }, 404)
        } catch (error) {
          json({ success: false, message: error instanceof Error ? error.message : '演示请求失败' }, error instanceof DemoError ? error.status : 400)
        }
      })
    },
  }
}
