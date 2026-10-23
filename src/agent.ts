import { config } from './config'
import { executeTool, toolDefinitions } from './tools'
import type { ChatMessage, ContentBlock, JsonObject, ModelProvider, ToolDefinition } from './types'

function buildSystemPrompt(tools: ToolDefinition[]): string {
  const toolLines = tools
    .map((tool) => `- ${tool.name}：${tool.description.replace(/。$/, '')}`)
    .join('\n')

  return `
你是一个运行在本地项目目录中的助手 NanoCode。

你可以使用以下工具完成任务：
${toolLines}

工作要求：
1. 先了解现有代码，再决定如何修改。
2. 尽量做最小、必要的修改。
3. 修改后适当运行测试或检查。
4. 不要声称执行过实际上没有执行的操作。
5. 如果遇到错误，分析结果并尝试合理修复。
6. 执行有破坏性的命令前，应先向用户确认。
7. 不要输出密钥或其他敏感凭据。
`
}

const SYSTEM_PROMPT = buildSystemPrompt(toolDefinitions).trim()

const TOOL_RESULT_DISPLAY_LIMIT = 1200

function formatResultForDisplay(content: string): string {
  if (content.length <= TOOL_RESULT_DISPLAY_LIMIT) {
    return content
  }

  return `${content.slice(0, TOOL_RESULT_DISPLAY_LIMIT)}\n…（已截断，完整内容 ${content.length} 字符）`
}

export class Agent {
  private readonly history: ChatMessage[] = []

  constructor(private readonly provider: ModelProvider) {}

  async runTask(userTask: string): Promise<void> {
    this.history.push({
      role: 'user',
      content: `${SYSTEM_PROMPT}\n\n` + `用户任务：\n${userTask}`,
    })

    for (let step = 0; step < config.maxSteps; step++) {
      const response = await this.provider.createMessage(this.history, toolDefinitions)

      this.history.push({
        role: 'assistant',
        content: response.content,
      })

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')

      if (text.trim()) {
        console.log(`\n${text.trim()}`)
      }

      const toolCalls = response.content.filter((block) => block.type === 'tool_use')

      if (toolCalls.length === 0) {
        return
      }

      const results: ContentBlock[] = []

      for (const call of toolCalls) {
        if (call.type !== 'tool_use') {
          continue
        }

        console.log(`\n[工具调用] ${call.name}`)

        const result = await executeTool(call.name, call.input as JsonObject)

        const status = result.is_error ? '[工具错误]' : '[工具完成]'
        const body = formatResultForDisplay(result.content)
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n')

        console.log(body ? `${status}\n${body}` : status)

        results.push({
          type: 'tool_result',
          tool_use_id: call.id,
          content: result.content,
          ...(result.is_error ? { is_error: true } : {}),
        })
      }

      this.history.push({
        role: 'user',
        content: results,
      })
    }

    console.log(`\n已达到最大执行步数（${config.maxSteps}），任务停止。`)
  }

  reset(): void {
    this.history.length = 0
  }
}
