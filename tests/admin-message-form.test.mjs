import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { rolldown } from 'rolldown'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const COMPONENT_PATH = path.join(ROOT, 'src/components/AdminMessageForm.tsx')

test('feedback replies lock the recipient while standalone messages allow choosing one', async () => {
  await assert.doesNotReject(fs.access(COMPONENT_PATH), 'shared message form must exist')
  const bundle = await rolldown({
    input: COMPONENT_PATH,
    external: (id) => !id.startsWith('.') && !path.isAbsolute(id) && !id.startsWith('\0'),
  })
  const tempDir = await fs.mkdtemp(path.join(ROOT, '.admin-message-test-'))
  try {
    const generated = await bundle.generate({ format: 'esm' })
    const chunk = generated.output.find((item) => item.type === 'chunk')
    const outputPath = path.join(tempDir, 'admin-message-form.mjs')
    await fs.writeFile(outputPath, chunk.code)
    const { default: AdminMessageForm } = await import(pathToFileURL(outputPath).href)
    const reply = renderToStaticMarkup(React.createElement(AdminMessageForm, {
      lockedRecipient: 'feedback-user-a',
      initialTitle: '反馈回复',
      onSent() {},
    }))
    const recipient = reply.match(/<input[^>]*id="[^"]*openid"[^>]*>/)?.[0]
    assert.ok(recipient, 'reply must show who will receive it')
    assert.match(recipient, /readonly=""/i)
    assert.match(recipient, /value="feedback-user-a"/)
    assert.match(reply, /value="反馈回复"/)

    const standalone = renderToStaticMarkup(React.createElement(AdminMessageForm, { onSent() {} }))
    const editable = standalone.match(/<input[^>]*id="[^"]*openid"[^>]*>/)?.[0]
    assert.ok(editable, 'standalone messages must keep the recipient input')
    assert.doesNotMatch(editable, /readonly/i)
  } finally {
    await bundle.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})
