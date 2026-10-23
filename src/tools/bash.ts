import type { JsonObject, ToolDefinition, ToolExecutionResult, ToolHandler } from '../types'
import { WORKSPACE } from './helpers'

async function runCommand(input: JsonObject): Promise<ToolExecutionResult> {
  const command = input.command

  if (typeof command !== 'string' || !command.trim()) {
    throw new Error('参数 command 必须是非空字符串。')
  }

  const proc = Bun.spawn(['bash', '-lc', command], {
    cwd: WORKSPACE,
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  })

  const timeoutMs = 30_000
  let timedOut = false

  const timeout = setTimeout(() => {
    timedOut = true
    proc.kill()
  }, timeoutMs)

  let exitCode: number
  let stdout: string
  let stderr: string

  try {
    const [code, out, err] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])

    exitCode = code
    stdout = out
    stderr = err
  } finally {
    clearTimeout(timeout)
  }

  const output = [
    stdout.trim(),
    stderr.trim() ? `STDERR:\n${stderr.trim()}` : '',
    `退出码：${exitCode}`,
    timedOut ? '命令超过 30 秒，已终止。' : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    content: output || '(命令没有输出)',
    ...(exitCode !== 0 || timedOut ? { is_error: true } : {}),
  }
}

export const bashToolDefinitions: ToolDefinition[] = [
  {
    name: 'run_command',
    description:
      '在项目工作目录执行 bash 命令。可用于运行测试、查看 Git 状态等。' +
      '命令具有当前用户的系统权限，请谨慎执行。',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '要执行的 bash 命令',
        },
      },
      required: ['command'],
    },
  },
]

export const bashToolHandlers: Record<string, ToolHandler> = {
  run_command: runCommand,
}
