import { readFile } from 'node:fs/promises'

import type { JsonObject, ToolDefinition, ToolExecutionResult, ToolHandler } from '../types'
import { resolveWorkspacePath, WORKSPACE } from './helpers'

function getString(input: JsonObject, key: string, fallback?: string): string {
  const value = input[key]

  if (typeof value === 'string') {
    return value
  }

  if (fallback !== undefined) {
    return fallback
  }

  throw new Error(`参数 ${key} 必须是字符串。`)
}

async function globFiles(input: JsonObject): Promise<ToolExecutionResult> {
  const pattern = getString(input, 'pattern')
  const glob = new Bun.Glob(pattern)
  const matches: string[] = []

  for await (const file of glob.scan({
    cwd: WORKSPACE,
    onlyFiles: true,
    dot: false,
  })) {
    matches.push(file)

    if (matches.length >= 500) {
      break
    }
  }

  return {
    content: matches.length ? matches.join('\n') : '没有找到匹配的文件。',
  }
}

async function grepFiles(input: JsonObject): Promise<ToolExecutionResult> {
  const query = getString(input, 'query')
  const pattern = getString(input, 'pattern', '**/*')
  const glob = new Bun.Glob(pattern)
  const results: string[] = []
  const maxResults = 200

  for await (const file of glob.scan({
    cwd: WORKSPACE,
    onlyFiles: true,
    dot: false,
  })) {
    const absolutePath = resolveWorkspacePath(file)
    let content: string

    try {
      content = await readFile(absolutePath, 'utf8')
    } catch {
      continue
    }

    const lines = content.split(/\r?\n/)

    for (let index = 0; index < lines.length; index++) {
      if (lines[index]!.includes(query)) {
        results.push(`${file}:${index + 1}: ${lines[index]}`)

        if (results.length >= maxResults) {
          return { content: results.join('\n') }
        }
      }
    }
  }

  return {
    content: results.length ? results.join('\n') : '没有找到匹配内容。',
  }
}

export const searchToolDefinitions: ToolDefinition[] = [
  {
    name: 'glob_files',
    description: '按 glob 模式查找工作区内的文件，例如 src/**/*.ts。',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'glob 文件匹配模式' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'grep_files',
    description: '在匹配的文件中搜索普通文本，返回文件路径、行号和匹配行。',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '要查找的文本' },
        pattern: {
          type: 'string',
          description: '要搜索的文件 glob 模式',
        },
      },
      required: ['query'],
    },
  },
]

export const searchToolHandlers: Record<string, ToolHandler> = {
  glob_files: globFiles,
  grep_files: grepFiles,
}
