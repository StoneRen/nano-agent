import { config } from '../config'
import type {
  ChatMessage,
  ContentBlock,
  JsonObject,
  ModelProvider,
  ModelResponse,
  ToolDefinition,
} from '../types'
import { postForJson } from './http'

interface AnthropicResponse {
  content?: Array<Record<string, unknown>>
  stop_reason?: string | null
}

function toAnthropicMessages(messages: ChatMessage[]) {
  return messages.map((message) => {
    if (typeof message.content === 'string') {
      return {
        role: message.role,
        content: message.content,
      }
    }

    const content = message.content.map((block) => {
      if (block.type === 'text') {
        return {
          type: 'text',
          text: block.text,
        }
      }

      if (block.type === 'tool_use') {
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input,
        }
      }

      return {
        type: 'tool_result',
        tool_use_id: block.tool_use_id,
        content: block.content,
        ...(block.is_error ? { is_error: true } : {}),
      }
    })

    return {
      role: message.role,
      content,
    }
  })
}

export class AnthropicProvider implements ModelProvider {
  async createMessage(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ModelResponse> {
    const data = (await postForJson(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'nanocode-bun-ts',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 8192,
        messages: toAnthropicMessages(messages),
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
        })),
      }),
    })) as AnthropicResponse

    const content: ContentBlock[] = []

    for (const block of data.content ?? []) {
      if (block.type === 'text' && typeof block.text === 'string') {
        content.push({
          type: 'text',
          text: block.text,
        })
      } else if (
        block.type === 'tool_use' &&
        typeof block.id === 'string' &&
        typeof block.name === 'string'
      ) {
        const input = block.input

        if (typeof input !== 'object' || input === null || Array.isArray(input)) {
          throw new Error(`工具 ${block.name} 返回了无效的参数对象。`)
        }

        content.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: input as JsonObject,
        })
      }
    }

    return {
      content,
      stop_reason: data.stop_reason ?? null,
    }
  }
}
