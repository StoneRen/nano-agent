import type { ApiProtocol } from './types'

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`缺少环境变量 ${name}，请检查项目根目录下的 .env 文件。`)
  }

  return value
}

const protocolValue = (process.env.API_PROTOCOL ?? 'openai').trim().toLowerCase()

if (protocolValue !== 'openai' && protocolValue !== 'anthropic') {
  throw new Error(`不支持的 API_PROTOCOL: ${protocolValue}。` + '可选值为 openai 或 anthropic。')
}

export interface AppConfig {
  apiKey: string
  protocol: ApiProtocol
  model: string
  baseUrl: string
  maxSteps: number
}

export const config: AppConfig = {
  apiKey: requiredEnv('OPENROUTER_API_KEY'),
  protocol: protocolValue as ApiProtocol,
  model: requiredEnv('MODEL'),
  baseUrl: 'https://openrouter.ai/api/v1',
  maxSteps: 30,
}
