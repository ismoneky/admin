import { test } from 'node:test'
import assert from 'node:assert/strict'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { rolldown } from 'rolldown'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const COMPONENT_PATH = path.join(ROOT, 'src/components/QueryFilterPanel.tsx')

test('query filters render as one accessible grid with wide mobile fields and aligned actions', async () => {
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
  const tempDir = await fsPromises.mkdtemp(path.join(ROOT, '.query-filter-test-'))

  try {
    const generated = await bundle.generate({ format: 'esm' })
    const chunk = generated.output.find((item) => item.type === 'chunk')
    assert.ok(chunk, 'component bundle must contain a JavaScript chunk')
    const outputPath = path.join(tempDir, 'query-filter-panel.mjs')
    await fsPromises.writeFile(outputPath, chunk.code)

    const {
      default: QueryFilterPanel,
      QueryFilterItem,
      QueryFilterActions,
    } = await import(pathToFileURL(outputPath).href)

    const html = renderToStaticMarkup(
      React.createElement(
        QueryFilterPanel,
        { columns: 4, name: 'query-filter-contract' },
        React.createElement(
          QueryFilterItem,
          { label: '预约日期', name: 'bookingDate' },
          React.createElement('input'),
        ),
        React.createElement(
          QueryFilterItem,
          { label: '创建日期', name: 'createdRange', wide: true },
          React.createElement('input'),
        ),
        React.createElement(
          QueryFilterActions,
          null,
          React.createElement('button', { type: 'button' }, '查询'),
        ),
      ),
    )

    assert.match(html, /<form[^>]*role="search"/)
    assert.match(html, /aria-label="筛选条件"/)
    assert.match(html, /query-filter-panel__item--wide/)
    assert.match(html, /query-filter-panel__actions/)
    assert.match(html, /--query-filter-columns:4/)
    assert.match(html, />预约日期</)
    assert.match(html, />查询</)
  } finally {
    await bundle.close()
    await fsPromises.rm(tempDir, { recursive: true, force: true })
  }
})
