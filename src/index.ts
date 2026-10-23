import { Agent } from './agent'
import { config } from './config'
import { createProvider } from './providers'
import { startTerminal } from './terminal'

async function main(): Promise<void> {
  const provider = createProvider()
  const agent = new Agent(provider)

  console.log(`API 协议：${config.protocol}`)
  console.log(`模型：${config.model}`)

  await startTerminal(agent)
}

main().catch((error: unknown) => {
  console.error('NanoCode 启动失败：', error instanceof Error ? error.message : String(error))

  process.exitCode = 1
})
