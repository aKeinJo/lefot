import OpenAI from "openai"
import { ModelCallResult, StreamCallback } from "./providers"

export async function callCustomOpenAI(params: {
  apiKey: string
  baseURL: string
  model: string
  prompt: string
  jsonMode?: boolean
  temperature?: number
}): Promise<ModelCallResult> {
  const client = new OpenAI({
    apiKey: params.apiKey,
    baseURL: params.baseURL || undefined,
    dangerouslyAllowBrowser: true,
  })

  try {
    const response = await client.chat.completions.create({
      model: params.model,
      messages: [{ role: "user", content: params.prompt }],
      ...(params.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
    })

    const text = response.choices[0]?.message?.content || ""

    return {
      text,
      tokens: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
      }
    }
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error("Custom Provider returned 404. Please check if your Request URL is correct (e.g., check if '/v1' is missing at the end).")
    }
    throw error
  }
}

export async function streamCustomOpenAI(params: {
  apiKey: string
  baseURL: string
  model: string
  prompt: string
  jsonMode?: boolean
  temperature?: number
  onChunk: StreamCallback
}): Promise<ModelCallResult> {
  const client = new OpenAI({
    apiKey: params.apiKey,
    baseURL: params.baseURL || undefined,
    dangerouslyAllowBrowser: true,
  })

  try {
    let fullText = ""

    const stream = await client.chat.completions.create({
      model: params.model,
      messages: [{ role: "user", content: params.prompt }],
      stream: true,
      stream_options: { include_usage: true },
      ...(params.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
    })

    let inputTokens = 0
    let outputTokens = 0

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ""
      if (text) {
        fullText += text
        params.onChunk({ type: "text", text })
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens || 0
        outputTokens = chunk.usage.completion_tokens || 0
      }
    }

    return {
      text: fullText,
      tokens: { input: inputTokens, output: outputTokens },
    }
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error("Custom Provider returned 404. Please check if your Request URL is correct (e.g., check if '/v1' is missing at the end).")
    }
    throw error
  }
}
