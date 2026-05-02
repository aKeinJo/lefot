import { create } from "zustand"

export type PanelMode = "idle" | "explain" | "suggest" | "retranslate"

interface UIState {
  isSidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void

  isPanelOpen: boolean
  setIsPanelOpen: (open: boolean) => void

  selectedChunkId: string | null
  setSelectedChunkId: (id: string | null) => void

  panelMode: PanelMode
  setPanelMode: (mode: PanelMode) => void

  // 팝오버에서 입력한 context를 패널로 전달
  pendingContext: string
  setPendingContext: (context: string) => void

  // 팝오버가 열린 청크 (하이라이트용)
  popoverOpenChunkId: string | null
  setPopoverOpenChunkId: (id: string | null) => void

  openPanel: (chunkId: string, mode: PanelMode, context?: string) => void

  // 패널 열기 전 사이드바 상태 (닫을 때 복원)
  _sidebarStateBeforePanel: boolean
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  isPanelOpen: false,
  setIsPanelOpen: (open) =>
    set((state) => {
      if (!open) {
        // 패널 닫기: 패널 열기 전 사이드바 상태로 복원
        return { isPanelOpen: false, isSidebarCollapsed: state._sidebarStateBeforePanel }
      }
      return { isPanelOpen: true }
    }),

  selectedChunkId: null,
  setSelectedChunkId: (id) => set({ selectedChunkId: id }),

  panelMode: "idle",
  setPanelMode: (mode) => set({ panelMode: mode }),

  pendingContext: "",
  setPendingContext: (context) => set({ pendingContext: context }),

  popoverOpenChunkId: null,
  setPopoverOpenChunkId: (id) => set({ popoverOpenChunkId: id }),

  _sidebarStateBeforePanel: false,

  openPanel: (chunkId, mode, context = "") =>
    set((state) => ({
      isPanelOpen: true,
      selectedChunkId: chunkId,
      panelMode: mode,
      pendingContext: context,
      _sidebarStateBeforePanel: state.isSidebarCollapsed,
      isSidebarCollapsed: true,
    })),
}))
