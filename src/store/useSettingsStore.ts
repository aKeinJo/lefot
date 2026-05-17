import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SettingValue {
  provider: {
    gemini: string
    claude: string
    openAI: string
    custom: {
      requestURL: string
      requestFormat: string
      apiKey: string
    }
  }
  providerOptions: {
    gemini: { streaming: boolean }
    claude: { streaming: boolean }
    openAI: { streaming: boolean }
    custom: { streaming: boolean }
  }
  model: {
    role: string
    name: string | null
    code: string | null
    temperature?: number
  }[]
  lastTargetLanguage: string
  customModelDrafts: Record<string, string>
  feedbackUsesMain: boolean
}

export const SYSTEM_DEFAULTS = {
  mainModel: "gemini-3-flash-preview",
  subModel: "gemini-3.1-flash-lite",
  useMainForFeedback: true,
  feedbackModel: "gemini-3-flash-preview",
}

const defaultSettings: SettingValue = {
  provider: {
    gemini: "",
    claude: "",
    openAI: "",
    custom: {
      requestURL: "",
      requestFormat: "openai",
      apiKey: "",
    },
  },
  providerOptions: {
    gemini: { streaming: true },
    claude: { streaming: true },
    openAI: { streaming: true },
    custom: { streaming: true },
  },
  model: [
    {
      role: "main",
      name: "Gemini 3 Flash Preview",
      code: SYSTEM_DEFAULTS.mainModel,
    },
    {
      role: "sub",
      name: "Gemini 3.1 Flash Lite Preview",
      code: SYSTEM_DEFAULTS.subModel,
      temperature: 0.2,
    },
    {
      role: "feedback",
      name: "Gemini 3 Flash Preview",
      code: SYSTEM_DEFAULTS.mainModel,
    },
  ],
  lastTargetLanguage: "ko", // Default to Korean or any preferred fallback
  customModelDrafts: {},
  feedbackUsesMain: true,
}

interface SettingsState {
  settings: SettingValue
  updateSettings: (newSettings: SettingValue) => void
  updateLastTargetLanguage: (lang: string) => void
  updateCustomModelDraft: (role: string, value: string) => void
  resetModels: () => void
  isHydrated: boolean
  setHydrated: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) => set({ settings: newSettings }),
      updateLastTargetLanguage: (lang) => 
        set((state) => ({ settings: { ...state.settings, lastTargetLanguage: lang } })),
      updateCustomModelDraft: (role, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            customModelDrafts: { ...state.settings.customModelDrafts, [role]: value },
          },
        })),
      resetModels: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            model: defaultSettings.model,
          },
        })),
      isHydrated: false,
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'lefot-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated()
        }
      },
    }
  )
)
