import Anthropic from "@anthropic-ai/sdk"
import { ModelCallResult, StreamCallback } from "./providers"

export async function callClaude(params: {
  apiKey: string
  model: string
  prompt: string
  jsonMode?: boolean
  temperature?: number
}): Promise<ModelCallResult> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    dangerouslyAllowBrowser: true,
  })

  const response = await client.messages.create({
    model: params.model,
    max_tokens: 8192,
    messages: [{ role: "user", content: params.prompt }],
    ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map(block => block.text)
    .join("")

  return {
    text,
    tokens: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    }
  }
}

export async function streamClaude(params: {
  apiKey: string
  model: string
  prompt: string
  jsonMode?: boolean
  temperature?: number
  onChunk: StreamCallback
}): Promise<ModelCallResult> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    dangerouslyAllowBrowser: true,
  })

  let fullText = ""
  let inputTokens = 0
  let outputTokens = 0

  const stream = await client.messages.stream({
    model: params.model,
    max_tokens: 8192,
    messages: [{ role: "user", content: params.prompt }],
    ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
  })

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const text = event.delta.text
      fullText += text
      params.onChunk({ type: "text", text })
    }
  }

  const finalMessage = await stream.finalMessage()
  inputTokens = finalMessage.usage.input_tokens
  outputTokens = finalMessage.usage.output_tokens

  return {
    text: fullText,
    tokens: { input: inputTokens, output: outputTokens },
  }
}
