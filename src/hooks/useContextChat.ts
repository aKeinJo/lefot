"use client";

import * as React from "react";
import { toast } from "sonner";
import { callChatModel } from "@/lib/api/chat";
import type { ChatMessage, ProjectData, Sentence } from "@/store/useProjectStore";
import type { SettingValue } from "@/store/useSettingsStore";
import type { PanelMode } from "@/store/useUIStore";

interface UseContextChatParams {
  data: ProjectData;
  selectedChunkId: string | null;
  selectedSentence: Sentence | null;
  settings: SettingValue;
  panelMode: PanelMode;
  isPanelOpen: boolean;
  pendingContext: string;
  setPendingContext: (v: string) => void;
  updateProject: (id: string, updates: Partial<Omit<ProjectData, "id">>) => void;
}

export function useContextChat({
  data,
  selectedChunkId,
  selectedSentence,
  settings,
  panelMode,
  isPanelOpen,
  pendingContext,
  setPendingContext,
  updateProject,
}: UseContextChatParams) {
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = React.useState<Set<string>>(new Set());
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // pendingContext (팝오버에서 전달된 context)를 input에 세팅
  React.useEffect(() => {
    if (pendingContext) {
      setInput(pendingContext);
      setPendingContext("");
    }
  }, [pendingContext, setPendingContext]);

  // 새 청크 선택 시 input + applied 초기화
  React.useEffect(() => {
    setInput("");
    setAppliedSuggestions(new Set());
  }, [selectedChunkId]);

  // 패널이 닫히면 input 초기화
  React.useEffect(() => {
    if (!isPanelOpen) setInput("");
  }, [isPanelOpen]);

  // 새 메시지 도착 시 스크롤
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedSentence?.conversation?.length, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || !selectedSentence || isLoading) return;
    const userMessage = input.trim();
    setInput("");

    const chatMode =
      panelMode === "suggest" || panelMode === "explain" ? panelMode : "explain";

    const prevConversation = selectedSentence.conversation ?? [];
    const userMsg: ChatMessage = { role: "user", content: userMessage };
    const nextConversation = [...prevConversation, userMsg];

    const page = data.pages[0];
    updateProject(data.id, {
      pages: [{ ...page, value: page.value.map((s) =>
        s.id === selectedChunkId ? { ...s, conversation: nextConversation } : s,
      ) }, ...data.pages.slice(1)],
    });

    setIsLoading(true);
    try {
      const responseText = await callChatModel({
        settings,
        mode: chatMode,
        source: selectedSentence.source,
        target: selectedSentence.target,
        history: prevConversation,
        userInput: userMessage,
      });

      const assistantMsg: ChatMessage = { role: "assistant", content: responseText };
      updateProject(data.id, {
        pages: [{ ...page, value: page.value.map((s) =>
          s.id === selectedChunkId
            ? { ...s, conversation: [...nextConversation, assistantMsg] }
            : s,
        ) }, ...data.pages.slice(1)],
      });
    } catch (err: any) {
      toast.error("Chat failed", { description: err.message });
      // 롤백
      updateProject(data.id, {
        pages: [{ ...page, value: page.value.map((s) =>
          s.id === selectedChunkId ? { ...s, conversation: prevConversation } : s,
        ) }, ...data.pages.slice(1)],
      });
      setInput(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (suggestion: string) => {
    if (!selectedSentence) return;
    const page = data.pages[0];
    updateProject(data.id, {
      pages: [{ ...page, value: page.value.map((s) =>
        s.id === selectedChunkId ? { ...s, target: suggestion } : s,
      ) }, ...data.pages.slice(1)],
    });
    setAppliedSuggestions((prev) => new Set(prev).add(suggestion));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return {
    input,
    setInput,
    isLoading,
    appliedSuggestions,
    scrollRef,
    handleSend,
    handleApply,
    handleKeyDown,
  };
}
