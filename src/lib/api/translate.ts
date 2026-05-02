import { Sentence } from "@/store/useProjectStore"
import { SettingValue } from "@/store/useSettingsStore"
import { buildTranslationPrompt, buildFormattingPrompt } from "@/lib/constants/prompts"
import {
  getProviderFromModelCode,
  getProviderLabel,
  validateProviderConfig,
  Provider,
  ModelCallResult,
  StreamCallback,
} from "./providers"
import { callGemini, streamGemini } from "./gemini"
import { callOpenAI, streamOpenAI } from "./openai"
import { callClaude, streamClaude } from "./claude"
import { callCustomOpenAI, streamCustomOpenAI } from "./custom-openai"

export interface TranslationResult {
  formattedData: Sentence[]
  rawTranslatedText: string
  stats: {
    durationMs: number
    mainModelTokens: { input: number; output: number }
    subModelTokens: { input: number; output: number }
  }
}

export interface TranslateParams {
  settings: SettingValue
  sourceText: string
  targetLanguageLabel: string
  guideline: string
  onStream?: StreamCallback
  onPhaseChange?: (
    phase: "translating" | "formatting",
    rawResult?: string,
    phaseStats?: { durationMs: number; input: number; output: number }
  ) => void
}

async function callModel(
  provider: Provider,
  modelCode: string,
  settings: SettingValue,
  prompt: string,
  jsonMode: boolean,
  onChunk?: StreamCallback,
  temperature?: number
): Promise<ModelCallResult> {
  // streaming 설정 확인 (providerOptions 없는 구버전 localStorage 대비 ?? true)
  const providerKey = provider as keyof SettingValue["providerOptions"]
  const streamingEnabled = settings.providerOptions?.[providerKey]?.streaming ?? true

  // streaming 가능한 경우 + onChunk 콜백이 있을 때만 streaming
  const useStream = streamingEnabled && !!onChunk && !jsonMode

  if (useStream && onChunk) {
    switch (provider) {
      case "gemini": return streamGemini({ apiKey: settings.provider.gemini, model: modelCode, prompt, jsonMode, onChunk, temperature })
      case "claude": return streamClaude({ apiKey: settings.provider.claude, model: modelCode, prompt, jsonMode, onChunk, temperature })
      case "openai": return streamOpenAI({ apiKey: settings.provider.openAI, model: modelCode, prompt, jsonMode, onChunk, temperature })
      case "custom": return streamCustomOpenAI({ apiKey: settings.provider.custom.apiKey, baseURL: settings.provider.custom.requestURL, model: modelCode, prompt, jsonMode, onChunk, temperature })
    }
  }

  switch (provider) {
    case "gemini":
      return callGemini({ apiKey: settings.provider.gemini, model: modelCode, prompt, jsonMode, temperature })
    case "claude":
      return callClaude({ apiKey: settings.provider.claude, model: modelCode, prompt, jsonMode, temperature })
    case "openai":
      return callOpenAI({ apiKey: settings.provider.openAI, model: modelCode, prompt, jsonMode, temperature })
    case "custom":
      return callCustomOpenAI({ apiKey: settings.provider.custom.apiKey, baseURL: settings.provider.custom.requestURL, model: modelCode, prompt, jsonMode, temperature })
  }
}

/**
 * Parse JSON from model output, handling:
 * - Raw JSON arrays
 * - JSON objects wrapping an array (OpenAI json_object mode)
 * - Markdown code block wrappers (Claude)
 */
function parseFormattedJSON(text: string): Sentence[] {
  let jsonString = text.trim()

  // Strip markdown code block wrappers if present
  if (jsonString.startsWith("```")) {
    jsonString = jsonString.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim()
  }

  // Extract JSON array even if there's preamble/thinking text before it
  // Matches from the first '[' to the last ']'
  const arrayMatch = jsonString.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    jsonString = arrayMatch[0]
  }

  const rawParsed = JSON.parse(jsonString)

  if (Array.isArray(rawParsed)) {
    return rawParsed
  }

  if (typeof rawParsed === "object" && rawParsed !== null) {
    const firstArrayValue = Object.values(rawParsed).find((v) => Array.isArray(v))
    if (Array.isArray(firstArrayValue)) {
      return firstArrayValue as Sentence[]
    }
  }

  throw new Error("Could not find a valid sentence array in the JSON response.")
}

/**
 * Extract and strip <checklist> (and legacy <translation_logic>) tags from model output.
 * Returns the extracted content and the stripped text.
 */
function extractAndStripChecklist(text: string): { content: string; stripped: string } {
  const match = text.match(/<(?:checklist|translation_logic)>([\s\S]*?)<\/(?:checklist|translation_logic)>/i)
  if (match) {
    return {
      content: match[1].trim(),
      stripped: text.replace(match[0], "").replace(/^\s+/, "").replace(/\s+$/, ""),
    }
  }
  return { content: "", stripped: text }
}

export async function translateWithModels(params: TranslateParams): Promise<TranslationResult> {
  const { settings, sourceText, targetLanguageLabel, guideline, onStream, onPhaseChange } = params
  const startTime = Date.now()

  const mainModelCode = settings.model.find((m) => m.role === "main")?.code
  const subModelCode = settings.model.find((m) => m.role === "sub")?.code

  if (!mainModelCode || !subModelCode) {
    throw new Error("Translation models are not fully configured.")
  }

  const mainProvider = getProviderFromModelCode(mainModelCode)
  const subProvider = getProviderFromModelCode(subModelCode)

  // Validate API keys / config for each provider used
  const mainError = validateProviderConfig(mainProvider, settings)
  if (mainError) throw new Error(mainError)

  if (subProvider !== mainProvider) {
    const subError = validateProviderConfig(subProvider, settings)
    if (subError) throw new Error(subError)
  }

  const mainLabel = getProviderLabel(mainProvider)
  const subLabel = getProviderLabel(subProvider)

  console.groupCollapsed(
    `🚀 Translation [Main: ${mainModelCode} (${mainLabel}) → Sub: ${subModelCode} (${subLabel})]`
  )

  try {
    // --- STEP 1: Translate (Main Model) ---
    console.log("⏳ STEP 1: Translating source text...")
    if (onPhaseChange) onPhaseChange("translating")

    const translationPrompt = buildTranslationPrompt(sourceText, targetLanguageLabel, guideline)
    console.log("[Main Model Prompt]\n", translationPrompt)

    const translatePhaseStart = Date.now()
    const translateResult = await callModel(mainProvider, mainModelCode, settings, translationPrompt, false, onStream)
    const translatePhaseEnd = Date.now()

    if (!translateResult.text) {
      throw new Error("Translation returned empty result.")
    }

    console.log("✅ STEP 1 Completed. Raw Translation:\n", translateResult.text)
    if (onPhaseChange) {
      onPhaseChange("formatting", translateResult.text, {
        durationMs: translatePhaseEnd - translatePhaseStart,
        input: translateResult.tokens.input,
        output: translateResult.tokens.output,
      })
    }

    // Strip <checklist> tags before sending to sub-model
    const { stripped: cleanTranslation } = extractAndStripChecklist(translateResult.text)

    // --- STEP 2: Format to JSON (Sub Model) ---
    console.log("⏳ STEP 2: Formatting to JSON array...")
    const formattingPrompt = buildFormattingPrompt(sourceText, cleanTranslation)
    console.log("[Sub Model Prompt]\n", formattingPrompt)

    const formatResult = await callModel(subProvider, subModelCode, settings, formattingPrompt, true, undefined, settings.model.find((m) => m.role === "sub")?.temperature)

    let parsedData: Sentence[]
    try {
      parsedData = parseFormattedJSON(formatResult.text)
      console.log("✅ STEP 2 Completed. Parsed Data:", parsedData)
    } catch (parseError) {
      console.error("❌ Failed to parse formatting response. Raw output was:\n", formatResult.text)
      throw new Error("Failed to parse the structured JSON from the model.")
    }

    const durationMs = Date.now() - startTime
    console.log(`🎉 All steps completed in ${durationMs}ms.`)
    console.groupEnd()

    return {
      formattedData: parsedData,
      rawTranslatedText: cleanTranslation,
      stats: {
        durationMs,
        mainModelTokens: translateResult.tokens,
        subModelTokens: formatResult.tokens,
      },
    }
  } catch (error: any) {
    console.error("❌ Translation Error:", error)
    console.groupEnd()
    throw new Error(error?.message || "An error occurred during translation.")
  }
}
