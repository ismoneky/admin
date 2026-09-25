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
  } finally {
    await bundle.close()
    await fsPromises.rm(tempDir, { recursive: true, force: true })
  }
})
