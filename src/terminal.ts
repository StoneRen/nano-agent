import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'

import type { Agent } from './agent'

export async function startTerminal(agent: Agent): Promise<void> {
  const rl = createInterface({
    input: stdin,
    output: stdout,
  })

  console.log('NanoCode — Bun + TypeScript')
  console.log('输入任务开始执行，输入 exit 或 quit 退出。')

  try {
    while (true) {
      const input = await rl.question('\n你 > ')
      const task = input.trim()

      if (!task) {
        continue
      }

      if (['exit', 'quit'].includes(task.toLowerCase())) {
        break
      }

      try {
        await agent.runTask(task)
      } catch (error) {
        console.error('\n[运行失败]', error instanceof Error ? error.message : String(error))
      }
    }
  } finally {
    rl.close()
  }
}
