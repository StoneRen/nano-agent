import type { JsonObject, ToolDefinition, ToolExecutionResult, ToolHandler } from '../types'
import { bashToolDefinitions, bashToolHandlers } from './bash'
import { fileToolDefinitions, fileToolHandlers } from './files'
import { searchToolDefinitions, searchToolHandlers } from './search'

export const toolDefinitions: ToolDefinition[] = [
  ...fileToolDefinitions,
  ...searchToolDefinitions,
  ...bashToolDefinitions,
]

const toolHandlers: Record<string, ToolHandler> = {
  ...fileToolHandlers,
  ...searchToolHandlers,
  ...bashToolHandlers,
}

export async function executeTool(name: string, input: JsonObject): Promise<ToolExecutionResult> {
  const handler = toolHandlers[name]

  if (!handler) {
    return {
      content: `未知工具：${name}`,
      is_error: true,
    }
  }

  try {
    return await handler(input)
  } catch (error) {
    return {
      content: error instanceof Error ? error.message : String(error),
      is_error: true,
    }
  }
}
