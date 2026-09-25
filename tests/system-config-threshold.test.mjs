import { test } from 'node:test'
import assert from 'node:assert/strict'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { rolldown } from 'rolldown'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PAGE_PATH = path.join(ROOT, 'src/pages/system-config/index.tsx')

test('system config renders a percentage control for the remaining-quota display threshold', async () => {
  const bundle = await rolldown({
    input: PAGE_PATH,
    external: (id) => !id.startsWith('.') && !path.isAbsolute(id) && !id.startsWith('\0'),
  })
  const tempDir = await fsPromises.mkdtemp(path.join(ROOT, '.system-config-test-'))

  try {
    const generated = await bundle.generate({ format: 'esm' })
    const chunk = generated.output.find((item) => item.type === 'chunk')
    assert.ok(chunk, 'page bundle must contain a JavaScript chunk')
    const outputPath = path.join(tempDir, 'system-config-page.mjs')
    await fsPromises.writeFile(outputPath, chunk.code)

    const { default: SystemConfigPage } = await import(pathToFileURL(outputPath).href)
    const html = renderToStaticMarkup(React.createElement(SystemConfigPage))

    assert.match(html, />剩余名额展示阈值</)
    assert.match(html, /id="quotaDisplayThresholdPercent"/)
    assert.match(html, /aria-valuemin="0"/)
    assert.match(html, /aria-valuemax="100"/)
    assert.match(html, />%<\/div>/)

    // 展示阈值管「要不要给数字」，紧张阈值管「给了数字要不要报警」。
    // 两者必须同时存在，否则运营调高展示阈值会把整个页面变成红色「仅剩」
    assert.match(html, />名额紧张阈值</)
    assert.match(html, /id="quotaAlertThresholdPercent"/)
    assert.equal(
      (html.match(/id="quota(Display|Alert)ThresholdPercent"/g) || []).length,
      2,
      '两个阈值控件都必须渲染',
    )

    // 容量口径是【单】不是【人】，单位后缀不能再说「人」
    assert.match(html, />单<\/div>/)
    assert.doesNotMatch(html, /addonAfter[^>]*人|>人<\/div>/)
  } finally {
    await bundle.close()
    await fsPromises.rm(tempDir, { recursive: true, force: true })
  }
})
