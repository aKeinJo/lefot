import { SettingValue } from "@/store/useSettingsStore"
import { ChatMessage } from "@/store/useProjectStore"
import { buildChatPrompt, buildRetranslatePrompt } from "@/lib/constants/prompts"
import { getProviderFromModelCode, validateProviderConfig, StreamCallback } from "./providers"
import { callGemini, streamGemini } from "./gemini"
import { callClaude, streamClaude } from "./claude"
import { callOpenAI, streamOpenAI } from "./openai"
import { callCustomOpenAI, streamCustomOpenAI } from "./custom-openai"

export interface CallChatParams {
  settings: SettingValue
  mode: "explain" | "suggest"
  source: string
  target: string
  history: ChatMessage[]
  userInput: string
}

export async function callChatModel(params: CallChatParams): Promise<string> {
  const { settings, mode, source, target, history, userInput } = params

  // feedback model: null → fall back to main model
  const feedbackEntry = settings.model.find((m) => m.role === "feedback")
  const mainEntry = settings.model.find((m) => m.role === "main")
  const modelCode = feedbackEntry?.code ?? mainEntry?.code ?? null

  if (!modelCode) {
    throw new Error("No model configured. Please set a main model in Settings.")
  }

  const provider = getProviderFromModelCode(modelCode)
  const validationError = validateProviderConfig(provider, settings)
  if (validationError) throw new Error(validationError)

  const prompt = buildChatPrompt(mode, source, target, history, userInput)

  const callArgs = { model: modelCode, prompt, jsonMode: false } as const

  let result
  switch (provider) {
    case "gemini":
      result = await callGemini({ ...callArgs, apiKey: settings.provider.gemini })
      break
    case "claude":
      result = await callClaude({ ...callArgs, apiKey: settings.provider.claude })
      break
    case "openai":
      result = await callOpenAI({ ...callArgs, apiKey: settings.provider.openAI })
      break
    case "custom":
      result = await callCustomOpenAI({
        ...callArgs,
        apiKey: settings.provider.custom.apiKey,
        baseURL: settings.provider.custom.requestURL,
      })
      break
  }

  return result.text
}

export interface CallRetranslateParams {
  settings: SettingValue
  targetSentence: string
  targetLanguageLabel: string
  contextBefore: string[]
  contextAfter: string[]
  userNote?: string
  onChunk?: StreamCallback
}

export async function callRetranslateModel(params: CallRetranslateParams): Promise<string> {
  const { settings, targetSentence, targetLanguageLabel, contextBefore, contextAfter, userNote, onChunk } = params

  // main model for retranslation (translation quality > feedback model)
  const mainEntry = settings.model.find((m) => m.role === "main")
  const modelCode = mainEntry?.code ?? null

  if (!modelCode) {
    throw new Error("No main model configured. Please set a main model in Settings.")
  }

  const provider = getProviderFromModelCode(modelCode)
  const validationError = validateProviderConfig(provider, settings)
  if (validationError) throw new Error(validationError)

  const prompt = buildRetranslatePrompt(targetSentence, targetLanguageLabel, contextBefore, contextAfter, userNote)

  const providerKey = provider as keyof SettingValue["providerOptions"]
  const streamingEnabled = settings.providerOptions?.[providerKey]?.streaming ?? true
  const useStream = streamingEnabled && !!onChunk

  const callArgs = { model: modelCode, prompt, jsonMode: false } as const

  if (useStream && onChunk) {
    let result
    switch (provider) {
      case "gemini":
        result = await streamGemini({ ...callArgs, apiKey: settings.provider.gemini, onChunk })
        break
      case "claude":
        result = await streamClaude({ ...callArgs, apiKey: settings.provider.claude, onChunk })
        break
      case "openai":
        result = await streamOpenAI({ ...callArgs, apiKey: settings.provider.openAI, onChunk })
        break
      case "custom":
        result = await streamCustomOpenAI({ ...callArgs, apiKey: settings.provider.custom.apiKey, baseURL: settings.provider.custom.requestURL, onChunk })
        break
    }
    return result.text
  }

  let result
  switch (provider) {
    case "gemini":
      result = await callGemini({ ...callArgs, apiKey: settings.provider.gemini })
      break
    case "claude":
      result = await callClaude({ ...callArgs, apiKey: settings.provider.claude })
      break
    case "openai":
      result = await callOpenAI({ ...callArgs, apiKey: settings.provider.openAI })
      break
    case "custom":
      result = await callCustomOpenAI({ ...callArgs, apiKey: settings.provider.custom.apiKey, baseURL: settings.provider.custom.requestURL })
      break
  }

  return result.text
}
