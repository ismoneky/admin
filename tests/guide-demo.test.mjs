import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rolldown } from 'rolldown'

let createGuideDemoStore
test.before(async () => {
  const bundle = await rolldown({ input: new URL('../dev/guide-demo-store.ts', import.meta.url).pathname, external: ['node:crypto'] })
  try {
    const { output } = await bundle.generate({ format: 'esm' })
    const module = await import(`data:text/javascript;base64,${Buffer.from(output[0].code).toString('base64')}`)
    createGuideDemoStore = module.createGuideDemoStore
  } finally { await bundle.close() }
})

test('demo saves edits across reads, rejects stale saves, and resets the sample', () => {
  const store = createGuideDemoStore()
  const initial = store.read()
  assert.equal(initial.points.length, 5)
  const draft = structuredClone(initial)
  draft.points[0].name = '本地修改'
  draft.points[0].visible = false
  draft.points[0].x = .4
  const saved = store.save(draft)
  assert.equal(saved.revision, initial.revision + 1)
  assert.equal(store.read().points[0].name, '本地修改')
  assert.equal(store.read().points[0].visible, false)
  assert.throws(() => store.save(initial), /重新加载/)
  store.reset()
  assert.equal(store.read().points[0].name, '风启之门')
  assert.throws(() => store.save(saved), /重新加载/)
})

test('demo validates drafts and limits simulated uploads to images with bounded memory', () => {
  const store = createGuideDemoStore()
  assert.throws(() => store.save({ ...store.read(), imageUrl: 'http://example.com/map.jpg' }), /HTTPS/)
  const bytes = Buffer.from('image example')
  assert.throws(() => store.upload(bytes, 'image/svg+xml'), /JPG/)
  assert.throws(() => store.upload(Buffer.alloc(10 * 1024 * 1024 + 1), 'image/jpeg'), /10 MB/)
  const imageUrl = store.upload(bytes, 'image/jpeg')
  assert.match(imageUrl, /^\/__guide-demo\/images\/[a-f0-9-]+\.jpg$/)
  assert.deepEqual(store.image(imageUrl).bytes, bytes)
  const doc = store.read()
  doc.imageUrl = imageUrl
  assert.equal(store.save(doc).imageUrl, imageUrl)
  store.reset()
  assert.equal(store.image(imageUrl), undefined)
})
