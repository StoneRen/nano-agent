import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { JsonObject, ToolDefinition, ToolExecutionResult, ToolHandler } from '../types'
import { resolveWorkspacePath } from './helpers'

function requiredString(input: JsonObject, key: string): string {
  const value = input[key]

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`参数 ${key} 必须是非空字符串。`)
  }

  return value
}

async function readFileTool(input: JsonObject): Promise<ToolExecutionResult> {
  const filePath = resolveWorkspacePath(requiredString(input, 'path'))

  const content = await readFile(filePath, 'utf8')

  return { content }
}

async function writeFileTool(input: JsonObject): Promise<ToolExecutionResult> {
  const filePath = resolveWorkspacePath(requiredString(input, 'path'))
  const content = requiredString(input, 'content')

  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf8')

  return {
    content: `已写入文件：${path.relative(process.cwd(), filePath)}`,
  }
}

async function editFileTool(input: JsonObject): Promise<ToolExecutionResult> {
  const filePath = resolveWorkspacePath(requiredString(input, 'path'))
  const oldText = requiredString(input, 'old_text')
  const newText = requiredString(input, 'new_text')

  const original = await readFile(filePath, 'utf8')
  const firstIndex = original.indexOf(oldText)

  if (firstIndex === -1) {
    throw new Error('找不到 old_text，文件没有被修改。')
  }

  if (original.indexOf(oldText, firstIndex + oldText.length) !== -1) {
    throw new Error('old_text 出现了多次，请提供更精确的文本片段。')
  }

  const updated =
    original.slice(0, firstIndex) + newText + original.slice(firstIndex + oldText.length)

  await writeFile(filePath, updated, 'utf8')

  return {
    content: `已修改文件：${path.relative(process.cwd(), filePath)}`,
  }
}

export const fileToolDefinitions: ToolDefinition[] = [
  {
    name: 'read_file',
    description: '读取工作区中的文本文件。',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '相对工作区的文件路径' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: '创建或覆盖工作区中的文本文件。',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '目标文件路径' },
        content: { type: 'string', description: '要写入的完整文件内容' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description:
      '将文件中唯一匹配的 old_text 替换为 new_text；' + '若未匹配或匹配多次，则拒绝修改。',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '目标文件路径' },
        old_text: { type: 'string', description: '要替换的原文' },
        new_text: { type: 'string', description: '替换后的文本' },
      },
      required: ['path', 'old_text', 'new_text'],
    },
  },
]

export const fileToolHandlers: Record<string, ToolHandler> = {
  read_file: readFileTool,
  write_file: writeFileTool,
  edit_file: editFileTool,
}
