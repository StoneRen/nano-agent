export type ApiProtocol = 'openai' | 'anthropic'

export type JsonObject = Record<string, unknown>

export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
    [key: string]: unknown
  }
}

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: JsonObject
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

export type MessageContent = string | ContentBlock[]

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: MessageContent
}

export interface ModelResponse {
  content: ContentBlock[]
  stop_reason: string | null
}

export interface ModelProvider {
  createMessage(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ModelResponse>
}

export interface ToolExecutionResult {
  content: string
  is_error?: boolean
}

export type ToolHandler = (input: JsonObject) => Promise<ToolExecutionResult>
