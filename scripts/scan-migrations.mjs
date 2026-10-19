#!/usr/bin/env node
import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || 'migrations')
const files = []

async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full)
    else if (/\.(sql|psql|txt|md)$/i.test(entry.name)) files.push(full)
  }
}

function scanBuffer(buffer) {
  const nullBytes = []
  for (let i = 0; i < buffer.length; i += 1) if (buffer[i] === 0) nullBytes.push(i)
  let decoded = ''
  let invalidUtf8 = false
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    invalidUtf8 = true
    decoded = new TextDecoder('utf-8').decode(buffer)
  }
  const controlChars = []
  for (let i = 0; i < decoded.length; i += 1) {
    const code = decoded.charCodeAt(i)
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127) {
      controlChars.push({ index: i, code, hex: `0x${code.toString(16).padStart(2, '0')}` })
    }
  }
  return { bytes: buffer.length, nullBytes, invalidUtf8, controlChars }
}

await walk(root)
files.sort()
const results = []
for (const file of files) results.push({ file: path.relative(process.cwd(), file), ...scanBuffer(await fs.readFile(file)) })
const flagged = results.filter(item => item.nullBytes.length || item.invalidUtf8 || item.controlChars.length)
console.log(JSON.stringify({ root: path.relative(process.cwd(), root), scanned: results.length, flagged: flagged.length, files: flagged.length ? flagged : results.map(({ file, bytes }) => ({ file, bytes })) }, null, 2))
process.exitCode = flagged.length ? 1 : 0
