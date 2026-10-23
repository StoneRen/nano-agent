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

interface OpenAIResponse {
  choices?: Array<{
    finish_reason?: string | null
    message?: {
      content?: string | null
      tool_calls?: Array<{
        id: string
        function: {
          name: string
          arguments: string
        }
      }>
    }
  }>
}

function toOpenAIMessages(messages: ChatMessage[]) {
  const result: Array<Record<string, unknown>> = []

  for (const message of messages) {
    if (typeof message.content === 'string') {
      result.push({
        role: message.role,
        content: message.content,
      })
      continue
    }

    if (message.role === 'assistant') {
      const text = message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')

      const toolCalls = message.content
        .filter((block) => block.type === 'tool_use')
        .map((block) => ({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        }))

      result.push({
        role: 'assistant',
        content: text || null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      })

      continue
    }

    for (const block of message.content) {
      if (block.type === 'text') {
        result.push({
          role: 'user',
          content: block.text,
        })
      } else if (block.type === 'tool_result') {
        result.push({
          role: 'tool',
          tool_call_id: block.tool_use_id,
          content: block.content,
        })
      }
    }
  }

  return result
}

export class OpenAIProvider implements ModelProvider {
  async createMessage(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ModelResponse> {
    const data = (await postForJson(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'nanocode-bun-ts',
      },
      body: JSON.stringify({
        model: config.model,
        messages: toOpenAIMessages(messages),
        tools: tools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema,
          },
        })),
      }),
    })) as OpenAIResponse

    const choice = data.choices?.[0]

    if (!choice?.message) {
      throw new Error('模型响应中没有 choices[0].message。')
    }

    const content: ContentBlock[] = []

    if (choice.message.content) {
      content.push({
        type: 'text',
        text: choice.message.content,
      })
    }

    for (const call of choice.message.tool_calls ?? []) {
      let input: JsonObject

      try {
        const parsed: unknown = JSON.parse(call.function.arguments || '{}')

        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('工具参数必须是 JSON 对象。')
        }

        input = parsed as JsonObject
      } catch (error) {
        throw new Error(
          `无法解析工具 ${call.function.name} 的参数：` +
            `${error instanceof Error ? error.message : String(error)}`,
        )
      }

      content.push({
        type: 'tool_use',
        id: call.id,
        name: call.function.name,
        input,
      })
    }

    return {
      content,
      stop_reason: choice.finish_reason ?? null,
    }
  }
}
