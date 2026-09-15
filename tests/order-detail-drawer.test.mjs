import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { rolldown } from 'rolldown'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const COMPONENT_PATH = path.join(ROOT, 'src/pages/orders/components/OrderDetailDrawer.tsx')

const booking = {
  id: '1',
  bookingId: 'BK202609150001',
  wechatOpenId: 'oExampleOpenIdForOrderDetail',
  passengers: [
    {
      name: '张三',
      phone: '13800000000',
      idCard: '110101199001011234',
      passengerType: 'adult',
      finalCharged: true,
    },
    {
      name: '小张',
      phone: '13800000000',
      idCard: '110101201901011234',
      passengerType: 'child',
      ageValue: 7,
      ageFree: true,
      finalCharged: false,
      pricingReason: 'child_age_free',
    },
  ],
  name: '张三',
  phone: '13800000000',
  idCard: '110101199001011234',
  bookingDate: '2026-09-20',
  timeSlot: 'morning',
  travelMode: 'selfDriving',
  outTradeNo: 'WX202609150001',
  licensePlate: '豫A12345',
  vehicleType: 'smallCar',
  personCount: 2,
  remarks: '请从北门进入',
  status: 'confirmed',
  isFree: false,
  amount: 1200,
  verifiedAt: null,
  verifiedBy: null,
  verifiedByName: null,
  createdAt: '2026-09-15T08:00:00.000Z',
  updatedAt: '2026-09-15T09:00:00.000Z',
}

test('order detail presents dense data as readable sections instead of one bordered table', async () => {
  assert.ok(fs.existsSync(COMPONENT_PATH), 'OrderDetailDrawer component must exist')

  const bundle = await rolldown({
    input: COMPONENT_PATH,
    external: (id) => !id.startsWith('.') && !path.isAbsolute(id) && !id.startsWith('\0'),
    plugins: [{
      name: 'ignore-component-css',
      resolveId(id) {
        return id.endsWith('.css') ? '\0empty-component-css' : null
      },
      load(id) {
        return id === '\0empty-component-css' ? 'export default {}' : null
      },
    }],
  })
  const tempDir = await fsPromises.mkdtemp(path.join(ROOT, '.order-detail-test-'))

  try {
    const generated = await bundle.generate({ format: 'esm' })
    const chunk = generated.output.find((item) => item.type === 'chunk')
    assert.ok(chunk, 'component bundle must contain a JavaScript chunk')
    const outputPath = path.join(tempDir, 'order-detail-drawer.mjs')
    await fsPromises.writeFile(outputPath, chunk.code)

    const { OrderDetailContent } = await import(pathToFileURL(outputPath).href)
    const html = renderToStaticMarkup(React.createElement(OrderDetailContent, { record: booking }))

    for (const heading of ['预约信息', '联系人信息', '同行人员', '出行信息', '订单记录']) {
      assert.match(html, new RegExp(heading))
    }
    assert.match(html, /BK202609150001/)
    assert.match(html, /WX202609150001/)
    assert.match(html, /¥12\.00/)
    assert.match(html, /1101\*{10}1234/)
    assert.match(html, /小张/)
    assert.doesNotMatch(html, /<table\b/)
  } finally {
    await bundle.close()
    await fsPromises.rm(tempDir, { recursive: true, force: true })
  }
})
