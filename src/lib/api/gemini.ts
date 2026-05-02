import { GoogleGenerativeAI } from "@google/generative-ai"
import { ModelCallResult, StreamCallback } from "./providers"

const makeModelConfig = (jsonMode?: boolean, temperature?: number) => ({
  generationConfig: {
    ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
    thinkingConfig: {
      includeThoughts: true,
      thinkingLevel: "HIGH",
    },
  } as any,
})

export async function callGemini(params: {
  apiKey: string
  model: string
  prompt: string
  jsonMode?: boolean
  temperature?: number
}): Promise<ModelCallResult> {
  const genAI = new GoogleGenerativeAI(params.apiKey)
  const model = genAI.getGenerativeModel({
    model: params.model,
    ...makeModelConfig(params.jsonMode, params.temperature),
  })

  const result = await model.generateContent(params.prompt)
  const text = result.response.text()

  let inputTokens = 0
  let outputTokens = 0
  if (result.response.usageMetadata) {
    inputTokens = result.response.usageMetadata.promptTokenCount || 0
    outputTokens = result.response.usageMetadata.candidatesTokenCount || 0
  }

  return {
    text,
    tokens: { input: inputTokens, output: outputTokens }
  }
}

export async function streamGemini(params: {
  apiKey: string
  model: string
  prompt: string
  jsonMode?: boolean
  temperature?: number
  onChunk: StreamCallback
}): Promise<ModelCallResult> {
  const genAI = new GoogleGenerativeAI(params.apiKey)
  const model = genAI.getGenerativeModel({
    model: params.model,
    ...makeModelConfig(params.jsonMode, params.temperature),
  })

  const result = await model.generateContentStream(params.prompt)

  let fullText = ""
  let inputTokens = 0
  let outputTokens = 0

  for await (const chunk of result.stream) {
    for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
      const partText: string = (part as any).text ?? ""
      if (!partText) continue

      if ((part as any).thought === true) {
        params.onChunk({ type: "thinking", text: partText })
      } else {
        fullText += partText
        params.onChunk({ type: "text", text: partText })
      }
    }
  }

  const usageMeta = (await result.response).usageMetadata
  if (usageMeta) {
    inputTokens = usageMeta.promptTokenCount || 0
    outputTokens = usageMeta.candidatesTokenCount || 0
  }

  return {
    text: fullText,
    tokens: { input: inputTokens, output: outputTokens },
  }
}
