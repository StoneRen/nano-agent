import { config } from '../config'
import type { ModelProvider } from '../types'
import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'

export function createProvider(): ModelProvider {
  switch (config.protocol) {
    case 'openai':
      return new OpenAIProvider()

    case 'anthropic':
      return new AnthropicProvider()
  }
}
