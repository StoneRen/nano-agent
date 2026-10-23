const MAX_RAW_LENGTH = 2000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function truncate(text: string): string {
  if (text.length <= MAX_RAW_LENGTH) {
    return text
  }

  return `${text.slice(0, MAX_RAW_LENGTH)}…（已截断，完整长度 ${text.length} 字符）`
}

function formatValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function formatRawBody(raw: unknown): string {
  if (typeof raw !== 'string') {
    return formatValue(raw)
  }

  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function buildErrorMessage(status: number, data: unknown, rawText: string): string {
  const lines: string[] = [`API 请求失败：HTTP ${status}`]

  const error = isRecord(data) && isRecord(data.error) ? data.error : null

  if (error) {
    if (typeof error.message === 'string' && error.message !== '') {
      lines.push(`  错误信息：${error.message}`)
    }

    if (error.type != null) {
      lines.push(`  错误类型：${formatValue(error.type)}`)
    }

    if (error.code != null) {
      lines.push(`  错误码：${formatValue(error.code)}`)
    }

    if (isRecord(error.metadata)) {
      const providerName = error.metadata.provider_name

      if (typeof providerName === 'string' && providerName !== '') {
        lines.push(`  上游提供商：${providerName}`)
      }

      if (error.metadata.raw != null) {
        lines.push(`  上游原始响应：${truncate(formatRawBody(error.metadata.raw))}`)
      }
    }
  }

  if (lines.length === 1 && rawText !== '') {
    lines.push(`  响应内容：${truncate(rawText)}`)
  }

  return lines.join('\n')
}

export async function postForJson(url: string, init: RequestInit): Promise<unknown> {
  let response: Response

  try {
    response = await fetch(url, init)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)

    throw new Error(`请求 ${url} 失败（网络错误）：${reason}`)
  }

  const rawText = await response.text()

  let data: unknown = null

  if (rawText !== '') {
    try {
      data = JSON.parse(rawText)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, data, rawText))
  }

  if (data === null) {
    throw new Error(`接口 ${url} 返回了非 JSON 响应：${truncate(rawText)}`)
  }

  return data
}
