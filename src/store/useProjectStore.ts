import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface Sentence {
  id: string
  source: string
  target: string
  lineBreaks?: number // 0 or omitted = space, 1 = \n, 2 = \n\n
  conversation?: ChatMessage[]
}

export interface Page {
  id: string
  sourceText: string
  snapshot?: { source: string; translation: string }
  isSynced: boolean
  value: Sentence[]
}

export interface ProjectData {
  id: string
  title: string
  guideline: string
  targetLanguage: string
  pages: Page[]
  rawTranslation?: string  // kept for old data compat; no longer written
  translationStats?: {
    durationMs: number
    mainModelTokens: { input: number; output: number }
    subModelTokens: { input: number; output: number }
    usedMainModel?: string
    usedLanguage?: string
  }
  updatedAt: number
}

interface ProjectState {
  projects: ProjectData[]
  addProject: (project: Omit<ProjectData, 'id' | 'updatedAt'>) => string
  updateProject: (id: string, updates: Partial<Omit<ProjectData, 'id'>>) => void
  deleteProject: (id: string) => void
  getProjectById: (id: string) => ProjectData | undefined
  isHydrated: boolean
  setHydrated: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      addProject: (project) => {
        const newProject: ProjectData = {
          ...project,
          id: uuidv4().substring(0, 8), // 짧은 ID 사용
          updatedAt: Date.now(),
        }
        set((state) => ({ projects: [newProject, ...state.projects] }))
        return newProject.id
      },
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        }))
      },
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }))
      },
      getProjectById: (id) => {
        return get().projects.find((p) => p.id === id)
      },
      isHydrated: false,
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'lefot-projects',
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { projects: any[] }
        if (version < 1 && Array.isArray(state.projects)) {
          state.projects = state.projects.map((p: any) => {
            if (!p.pages) {
              return {
                ...p,
                pages: [{
                  id: uuidv4().substring(0, 8),
                  sourceText: p.sourceText ?? '',
                  snapshot: p.rawTranslation
                    ? { source: p.sourceText ?? '', translation: p.rawTranslation }
                    : undefined,
                  isSynced: p.isSynced ?? false,
                  value: p.value ?? [],
                }],
              }
            }
            return p
          })
        }
        return state
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated()
        }
      },
    }
  )
)
