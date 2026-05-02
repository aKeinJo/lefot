import { SettingValue } from "@/store/useSettingsStore"

export type Provider = "gemini" | "claude" | "openai" | "custom"

export interface ModelCallResult {
  text: string
  tokens: { input: number; output: number }
}

export interface StreamChunk {
  type: "thinking" | "text"
  text: string
}

export type StreamCallback = (chunk: StreamChunk) => void

export function getProviderFromModelCode(code: string): Provider {
  if (code.startsWith("gemini")) return "gemini"
  if (code.startsWith("claude")) return "claude"
  if (code.startsWith("gpt")) return "openai"
  if (code === "custom") return "custom"
  return "custom"
}

const providerLabels: Record<Provider, string> = {
  gemini: "Gemini",
  claude: "Claude",
  openai: "OpenAI",
  custom: "Custom Provider",
}

export function getProviderLabel(provider: Provider): string {
  return providerLabels[provider]
}

export function getApiKeyForProvider(provider: Provider, settings: SettingValue): string {
  switch (provider) {
    case "gemini": return settings.provider.gemini
    case "claude": return settings.provider.claude
    case "openai": return settings.provider.openAI
    case "custom": return settings.provider.custom.apiKey
  }
}

export function validateProviderConfig(provider: Provider, settings: SettingValue): string | null {
  const key = getApiKeyForProvider(provider, settings)
  if (!key || key.trim() === "") {
    return `${providerLabels[provider]} API Key is missing. Please configure it in settings first.`
  }
  if (provider === "custom" && !settings.provider.custom.requestURL) {
    return "Custom provider Request URL is missing. Please configure it in settings first."
  }
  return null
}
