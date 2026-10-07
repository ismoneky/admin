import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rolldown } from 'rolldown'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'src/pages/scenic-guide/model.ts')
let model
test.before(async () => {
  const bundle = await rolldown({ input: source })
  try {
    const generated = await bundle.generate({ format: 'esm' })
    const code = generated.output.find(item => item.type === 'chunk').code
    model = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  } finally { await bundle.close() }
})

const guide = () => ({ title: '景区导览', imageUrl: 'https://cdn.example.com/map.jpg', imageWidth: 2412, imageHeight: 1280, revision: 1, updatedAt: null, points: [] })

test('point picking uses the image bounds at different display sizes and clamps dragging outside', () => {
  assert.deepEqual(model.imagePoint(600, 300, { left: 100, top: 50, width: 1000, height: 500 }), { x: 0.5, y: 0.5 })
  assert.deepEqual(model.imagePoint(300, 175, { left: 50, top: 50, width: 500, height: 250 }), { x: 0.5, y: 0.5 })
  assert.deepEqual(model.imagePoint(-10, 800, { left: 0, top: 0, width: 500, height: 250 }), { x: 0, y: 1 })
  assert.equal(model.imagePoint(0, 0, { left: 0, top: 0, width: 0, height: 0 }), null)
})

test('validation identifies the erroneous point, preserves zero positions, and accepts multi-category points', () => {
  const doc = guide()
  const point = model.newGuidePoint('p1', { x: 0, y: 1 }, 0)
  doc.points = [point]
  assert.equal(model.validateDraft(doc).pointId, 'p1')
  point.name = '入口'
  point.categories = ['entrance', 'parking']
  assert.equal(model.validateDraft(doc), null)
  point.latitude = 35
  assert.match(model.validateDraft(doc).message, /经纬度/)
  point.longitude = 114
  assert.equal(model.validateDraft(doc), null)
  point.imageUrl = 'javascript:alert(1)'
  assert.match(model.validateDraft(doc).message, /HTTPS/)
})

test('image replacement retains or clears points only as requested and updates dimensions', () => {
  const doc = guide()
  doc.points = [{ ...model.newGuidePoint('p1', { x: 0.2, y: 0.5 }, 0), name: '测试' }]
  const nextImage = { imageUrl: 'https://cdn.example.com/new.jpg', width: 800, height: 600 }
  const retained = model.replaceGuideImage(doc, nextImage, false)
  assert.deepEqual(retained.points, doc.points)
  assert.equal(retained.imageWidth, 800)
  assert.equal(retained.imageHeight, 600)
  assert.equal(model.replaceGuideImage(doc, nextImage, true).points.length, 0)
  assert.equal(doc.points.length, 1)
})

test('a missing map, invalid category, and duplicate ids cannot be published', () => {
  assert.ok(model.validateDraft({ ...guide(), imageUrl: '' }))
  const p = { ...model.newGuidePoint('same', { x: 0.2, y: 0.5 }, 0), name: '同名' }
  assert.ok(model.validateDraft({ ...guide(), points: [p, p] }))
  assert.ok(model.validateDraft({ ...guide(), points: [{ ...p, categories: ['bad'] }] }))
})
