// Todo
// - Send 버튼 누르면 사용자의 chatbubble이 영역 최상단에 오도록 (왜 LLM 챗봇에서 이걸 하는지 알게됨. 현재는 위치 고정이라 답변이 바로 안보임.)
// - Suggest 버튼 누르면 Disable되는데, 다른 버튼도 같이 Disable되거나 누른 버튼도 Disable되지 않아야 할듯. 아니면 누를 때 다른 버튼들은 Enabled되거나. 그리고 과거 대화가 됐을 때에는 어떻게 할지도 고민해봐야 할듯. (예: 새로운 메시지를 보내서 과거 대화가 됐는데, 계속 Enabled 상태로 남아있어야 할까?)
// - Suggest 패널이 열려서 메시지가 하이라이팅되었을 때 다른 청크 호버 시 하이라이트가 사라지는데, Suggest 패널이 열려있는 동안에는 다른 청크 호버 시에도 하이라이팅이 유지되는 게 좋을듯. 그냥 패널 및 팝오버 열려있을 때 하이라이트는 호버 청크랑 구분해야 할듯.

"use client";

import * as React from "react";
import {
  X,
  RefreshCw,
  Send,
  MessageSquare,
  Pencil,
  Check,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, getSeparator } from "@/lib/utils";
import { toast } from "sonner";

import { ChatMessage, ProjectData } from "@/store/useProjectStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUIStore, PanelMode } from "@/store/useUIStore";
import { InputGroup, InputGroupTextarea } from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { callChatModel, callRetranslateModel } from "@/lib/api/chat";
import { languages } from "./language-combobox";

// |||suggestion|reason|| 형식 파싱
export interface EditOption {
  type: "edit";
  suggestion: string;
  reason: string;
}

type ContentSegment = string | EditOption[];

/**
 * 어시스턴트 응답에서 |||...|| 블록을 파싱하여
 * 텍스트와 EditOption 배열이 섞인 세그먼트 배열로 반환
 */
export function parseAssistantContent(text: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  // |||suggestion|reason|| 패턴 — 연속된 여러 개를 하나의 EditOption[] 그룹으로 묶음
  const blockRegex = /(\|\|\|[\s\S]*?\|\|)+/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const leading = text.slice(lastIndex, match.index).trim();
      if (leading) segments.push(leading);
    }

    const options: EditOption[] = [];
    const itemRegex = /\|\|\|([\s\S]*?)\|\|/g;
    let item: RegExpExecArray | null;
    while ((item = itemRegex.exec(match[0])) !== null) {
      const parts = item[1].split("|");
      const suggestion = parts[0].trim();
      const reason = parts.slice(1).join("|").trim();
      if (suggestion) options.push({ type: "edit", suggestion, reason });
    }
    if (options.length > 0) segments.push(options);

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex).trim();
    if (tail) segments.push(tail);
  }

  return segments;
}

interface ContextPanelProps {
  data: ProjectData;
}

const modeLabel: Record<Exclude<PanelMode, "idle" | "retranslate">, string> = {
  explain: "Explain",
  suggest: "Suggest Edit",
};

const modeIcon: Record<
  Exclude<PanelMode, "idle" | "retranslate">,
  React.ReactNode
> = {
  explain: <MessageSquare className="w-3 h-3" />,
  suggest: <Pencil className="w-3 h-3" />,
};

export function ContextPanel({ data }: ContextPanelProps) {
  const {
    isPanelOpen,
    setIsPanelOpen,
    selectedChunkId,
    panelMode,
    setPanelMode,
    pendingContext,
    setPendingContext,
  } = useUIStore();

  const { updateProject } = useProjectStore();
  const { settings } = useSettingsStore();

  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = React.useState<
    Set<string>
  >(new Set());
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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

  const selectedSentence =
    data.value.find((s) => s.id === selectedChunkId) ?? null;

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedSentence?.conversation?.length, isLoading]);

  // 패널이 닫히면 선택 초기화
  React.useEffect(() => {
    if (!isPanelOpen) setInput("");
  }, [isPanelOpen]);

  const handleClose = () => {
    setIsPanelOpen(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedSentence || isLoading) return;
    const userMessage = input.trim();
    setInput("");

    const chatMode =
      panelMode === "suggest" || panelMode === "explain"
        ? panelMode
        : "explain";

    // 낙관적 업데이트: 사용자 메시지 먼저 추가
    const prevConversation = selectedSentence.conversation ?? [];
    const userMsg: ChatMessage = { role: "user", content: userMessage };
    const nextConversation = [...prevConversation, userMsg];

    updateProject(data.id, {
      value: data.value.map((s) =>
        s.id === selectedChunkId ? { ...s, conversation: nextConversation } : s,
      ),
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

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: responseText,
      };
      updateProject(data.id, {
        value: data.value.map((s) =>
          s.id === selectedChunkId
            ? { ...s, conversation: [...nextConversation, assistantMsg] }
            : s,
        ),
      });
    } catch (err: any) {
      toast.error("Chat failed", { description: err.message });
      // 롤백
      updateProject(data.id, {
        value: data.value.map((s) =>
          s.id === selectedChunkId
            ? { ...s, conversation: prevConversation }
            : s,
        ),
      });
      setInput(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (suggestion: string) => {
    if (!selectedSentence) return;
    updateProject(data.id, {
      value: data.value.map((s) =>
        s.id === selectedChunkId ? { ...s, target: suggestion } : s,
      ),
    });
    setAppliedSuggestions((prev) => new Set(prev).add(suggestion));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // mode가 retranslate일 땐 chat 모드 기본값 explain으로
  const chatMode: "explain" | "suggest" =
    panelMode === "suggest" ? "suggest" : "explain";

  // --- Retranslate / Direct Edit 로컬 상태 ---
  type EditMode = "retranslate" | "direct";
  const [editMode, setEditMode] = React.useState<EditMode>("retranslate");
  const [retransSource, setRetransSource] = React.useState("");
  const [retransResult, setRetransResult] = React.useState("");
  const [isRetranslating, setIsRetranslating] = React.useState(false);
  const [userNote, setUserNote] = React.useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);
  const [directSource, setDirectSource] = React.useState("");
  const [directTarget, setDirectTarget] = React.useState("");

  // panelMode 변경 시 retranslate 상태 초기화
  React.useEffect(() => {
    if (panelMode === "retranslate") {
      setEditMode("retranslate");
      setRetransResult("");
      setUserNote("");
      setIsAdvancedOpen(false);
    }
  }, [panelMode, selectedChunkId]);

  // 청크 변경 시 retranslate 소스·결과 초기화
  React.useEffect(() => {
    if (selectedSentence) {
      setRetransSource(selectedSentence.source);
      setDirectSource(selectedSentence.source);
      setDirectTarget(selectedSentence.target);
      setRetransResult("");
    }
  }, [selectedChunkId, selectedSentence?.source, selectedSentence?.target]);

  // applyEdit: value + sourceText 재구성 후 updateProject
  const applyEdit = React.useCallback(
    (newSource: string, newTarget: string) => {
      if (!selectedSentence) return;
      const lang = data.translationStats?.usedLanguage ?? data.targetLanguage;
      const sep = getSeparator(lang);
      const newValue = data.value.map((s) =>
        s.id === selectedChunkId
          ? { ...s, source: newSource.trimEnd(), target: newTarget.trimEnd() }
          : s,
      );
      const newSourceText = newValue
        .map((s, idx) => {
          let suffix = sep;
          if (s.lineBreaks === 1) suffix = "\n";
          if (s.lineBreaks === 2) suffix = "\n\n";
          if (idx === newValue.length - 1 && !s.lineBreaks) suffix = "";
          return s.source + suffix;
        })
        .join("");
      updateProject(data.id, {
        value: newValue,
        sourceText: newSourceText,
        isSynced: true,
      });
    },
    [data, selectedChunkId, selectedSentence, updateProject],
  );

  const handleRetranslate = async () => {
    if (!selectedSentence || isRetranslating) return;
    setIsRetranslating(true);
    setRetransResult("");

    const sentenceIdx = data.value.findIndex((s) => s.id === selectedChunkId);
    const contextBefore = data.value
      .slice(Math.max(0, sentenceIdx - 2), sentenceIdx)
      .map((s) => s.target);
    const contextAfter = data.value
      .slice(sentenceIdx + 1, sentenceIdx + 3)
      .map((s) => s.target);

    const usedLang = data.translationStats?.usedLanguage ?? data.targetLanguage;
    const targetLanguageLabel =
      languages.find((l) => l.value === usedLang)?.label ?? usedLang;

    try {
      await callRetranslateModel({
        settings,
        targetSentence: retransSource,
        targetLanguageLabel,
        contextBefore,
        contextAfter,
        userNote: userNote.trim() || undefined,
        onChunk: (chunk) => {
          if (chunk.type === "text") {
            setRetransResult((prev) => prev + chunk.text);
          }
        },
      });
    } catch (err: any) {
      toast.error("Retranslation failed", { description: err.message });
    } finally {
      setIsRetranslating(false);
    }
  };

  const handleApplyRetranslate = () => {
    if (!retransResult.trim()) return;
    applyEdit(retransSource, retransResult.trim());
    setRetransResult("");
  };

  const handleApplyDirect = () => {
    applyEdit(directSource, directTarget);
  };

  return (
    <div className="flex flex-col bg-lefot-bg border-lefot-border border-l w-80 h-full overflow-hidden">
      {/* Panel Header */}
      <div className="flex border-lefot-border border-b">
        <div className="flex justify-between items-center gap-4 mx-4 w-full h-16">
          <div className="flex gap-2 w-full h-full">
            {panelMode !== "idle" && panelMode !== "retranslate" && (
              <div>
                <span className="hidden">
                  {
                    modeLabel[
                      panelMode as Exclude<PanelMode, "idle" | "retranslate">
                    ]
                  }
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 shrink-0"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {selectedSentence ? (
        <>
          {panelMode === "retranslate" ? (
            /* Retranslate / Direct Edit mode */
            <div className="flex flex-col flex-1 gap-0 overflow-y-auto">
              {/* Mode toggle */}
              <div className="flex items-center gap-1 bg-lefot-bg-secondary m-4 mb-2 p-0.5 border border-lefot-border rounded-lg">
                <button
                  className={cn(
                    "flex-1 py-1.5 rounded-md font-medium text-xs transition-colors",
                    editMode === "retranslate"
                      ? "bg-lefot-bg-primary text-foreground shadow-sm"
                      : "text-lefot-text-secondary hover:text-foreground",
                  )}
                  onClick={() => setEditMode("retranslate")}
                >
                  Retranslate
                </button>
                <button
                  className={cn(
                    "flex-1 py-1.5 rounded-md font-medium text-xs transition-colors",
                    editMode === "direct"
                      ? "bg-lefot-bg-primary text-foreground shadow-sm"
                      : "text-lefot-text-secondary hover:text-foreground",
                  )}
                  onClick={() => setEditMode("direct")}
                >
                  Direct Edit
                </button>
              </div>

              {editMode === "retranslate" ? (
                /* ---- Retranslate subview ---- */
                <div className="flex flex-col gap-3 px-4 pb-4">
                  {/* Source textarea (editable) */}
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-lefot-text-secondary text-xs">
                      Source
                    </p>
                    <Textarea
                      value={retransSource}
                      onChange={(e) => setRetransSource(e.target.value)}
                      className="min-h-[72px] text-sm resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Advanced: user note */}
                  <div>
                    <button
                      className="flex items-center gap-1 text-lefot-text-secondary hover:text-foreground text-xs transition-colors"
                      onClick={() => setIsAdvancedOpen((v) => !v)}
                    >
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 transition-transform",
                          isAdvancedOpen && "rotate-180",
                        )}
                      />
                      Additional instruction
                    </button>
                    {isAdvancedOpen && (
                      <Textarea
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder="e.g. Use formal register, keep the metaphor..."
                        className="mt-1.5 min-h-[56px] text-sm resize-none"
                        rows={2}
                      />
                    )}
                  </div>

                  {/* Translate button */}
                  <Button
                    variant="primary"
                    className="gap-1.5 w-full"
                    disabled={!retransSource.trim() || isRetranslating}
                    onClick={handleRetranslate}
                  >
                    <RefreshCw
                      className={cn(
                        "w-4 h-4",
                        isRetranslating && "animate-spin",
                      )}
                    />
                    {isRetranslating ? "Translating…" : "Translate"}
                  </Button>

                  {/* Streaming result */}
                  {(retransResult || isRetranslating) && (
                    <div className="flex flex-col gap-2">
                      <div className="bg-lefot-bg-secondary p-3 border border-lefot-border rounded-md min-h-[52px] text-sm leading-relaxed whitespace-pre-wrap">
                        {retransResult || (
                          <span className="text-lefot-text-secondary text-xs animate-pulse">
                            ●●●
                          </span>
                        )}
                      </div>
                      {retransResult && !isRetranslating && (
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            className="flex-1 gap-1.5 text-xs"
                            onClick={handleApplyRetranslate}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Apply
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 gap-1.5 text-xs"
                            onClick={handleRetranslate}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retry
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* ---- Direct Edit subview ---- */
                <div className="flex flex-col gap-3 px-4 pb-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-lefot-text-secondary text-xs">
                      Source
                    </p>
                    <Textarea
                      value={directSource}
                      onChange={(e) => setDirectSource(e.target.value)}
                      className="min-h-[72px] text-sm resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-lefot-text-secondary text-xs">
                      Translation
                    </p>
                    <Textarea
                      value={directTarget}
                      onChange={(e) => setDirectTarget(e.target.value)}
                      className="min-h-[72px] text-sm resize-none"
                      rows={3}
                    />
                  </div>
                  <Button
                    variant="primary"
                    className="gap-1.5 w-full"
                    disabled={!directSource.trim() || !directTarget.trim()}
                    onClick={handleApplyDirect}
                  >
                    <Check className="w-4 h-4" />
                    Apply
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Explain / Suggest: chat UI */
            <div className="flex-1 bg-lefot-bg-secondary overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
              <div className="relative flex flex-col w-full min-h-full">
                <div className="flex flex-col flex-1 gap-4 my-4 mr-2 ml-4">
                  {/* Selected chunk */}
                  <div className="flex flex-col gap-4 pb-4 border-lefot-border border-b">
                    <div className="flex flex-col gap-2">
                      <p className="font-bold text-lefot-text-danger">
                        NOTICE: Currently Unstable.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-lefot-text-secondary text-xs">
                        Source
                      </p>
                      <p className="text-foreground text-sm leading-relaxed">
                        {selectedSentence.source}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-lefot-text-secondary text-xs">
                        Translation
                      </p>
                      <p className="text-foreground text-sm leading-relaxed">
                        {selectedSentence.target}
                      </p>
                    </div>
                  </div>

                  {/* Chat messages */}
                  <div ref={scrollRef} className="flex flex-col gap-6 mb-4">
                    {!selectedSentence.conversation ||
                    selectedSentence.conversation.length === 0 ? (
                      <p className="text-lefot-text-secondary text-xs">
                        Ask something to get started.
                      </p>
                    ) : (
                      selectedSentence.conversation.map((msg, idx) => (
                        <ChatBubble
                          key={idx}
                          message={msg}
                          appliedSuggestions={appliedSuggestions}
                          onApply={handleApply}
                        />
                      ))
                    )}
                    {isLoading && (
                      <div className="flex items-center gap-1.5 text-lefot-text-secondary text-xs">
                        <span className="animate-pulse">●</span>
                        <span
                          className="animate-pulse"
                          style={{ animationDelay: "150ms" }}
                        >
                          ●
                        </span>
                        <span
                          className="animate-pulse"
                          style={{ animationDelay: "300ms" }}
                        >
                          ●
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Input area */}
                <div className="bottom-0 sticky w-full">
                  <InputGroup
                    onClick={() => textareaRef.current?.focus()}
                    className="flex flex-col gap-1 bg-lefot-bg-tertiary mb-2 ml-2 p-2 w-auto cursor-text shrink-0"
                  >
                    <InputGroupTextarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask something... (⌘↵ to send)"
                      className="bg-transparent p-0 min-h-6 max-h-30 text-sm resize-none"
                      autoFocus
                    />
                    <div className="flex justify-between items-center w-full">
                      <Toggle
                        variant="outline"
                        size="sm"
                        pressed={chatMode === "suggest"}
                        onPressedChange={(pressed) => {
                          setPanelMode(pressed ? "suggest" : "explain");
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="gap-1 data-[state=on]:bg-lefot-bg-brand/20 px-2 py-0.5 hover:border-lefot-border-brand text-xs"
                      >
                        <Pencil className="size-4" />
                        <span>Edit</span>
                      </Toggle>
                      <Button
                        variant="primary"
                        size="icon-sm"
                        className="shrink-0"
                        disabled={!input.trim() || isLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSend();
                        }}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </InputGroup>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Idle state: translation stats */
        <div className="flex flex-col flex-1 gap-4 p-4 overflow-y-auto">
          <p className="text-lefot-text-secondary text-sm">
            Click a sentence on the right to start.
          </p>
          {data.translationStats && (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-sm">Translation Stats</p>
              <StatRow
                label="Total time"
                value={`${(data.translationStats.durationMs / 1000).toFixed(1)}s`}
              />
              <StatRow
                label="Main — in"
                value={String(data.translationStats.mainModelTokens.input)}
              />
              <StatRow
                label="Main — out"
                value={String(data.translationStats.mainModelTokens.output)}
              />
              <StatRow
                label="Sub — in"
                value={String(data.translationStats.subModelTokens.input)}
              />
              <StatRow
                label="Sub — out"
                value={String(data.translationStats.subModelTokens.output)}
              />
            </div>
          )}
          {data.rawTranslation && (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-sm">Raw Translation</p>
              <p className="text-lefot-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                {data.rawTranslation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
  appliedSuggestions: Set<string>;
  onApply: (suggestion: string) => void;
}

function ChatBubble({ message, appliedSuggestions, onApply }: ChatBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="bg-lefot-bg-tertiary px-3 py-2 rounded-md leading-relaxed whitespace-pre-wrap">
          <span className="text-sm">{message.content}</span>
        </div>
      </div>
    );
  }

  const segments = parseAssistantContent(message.content);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-lefot-text-secondary text-xs">Assistant</span>
      {segments.map((seg, i) =>
        typeof seg === "string" ? (
          <span
            key={i}
            className="text-lefot-text text-sm leading-relaxed whitespace-pre-wrap"
          >
            {seg}
          </span>
        ) : (
          <div key={i} className="flex flex-col gap-2">
            {seg.map((opt) => (
              <EditOptionCard
                key={opt.suggestion}
                option={opt}
                applied={appliedSuggestions.has(opt.suggestion)}
                onApply={onApply}
              />
            ))}
          </div>
        ),
      )}
    </div>
  );
}

interface EditOptionCardProps {
  option: EditOption;
  applied: boolean;
  onApply: (suggestion: string) => void;
}

function EditOptionCard({ option, applied, onApply }: EditOptionCardProps) {
  return (
    <button
      type="button"
      disabled={applied}
      onClick={() => onApply(option.suggestion)}
      className={cn(
        "flex flex-col gap-1 px-3 py-2.5 border rounded-md w-full text-left transition-all",
        applied
          ? "border-border opacity-50 cursor-default"
          : "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <span className="flex-1 text-foreground text-sm leading-relaxed">
          {option.suggestion}
        </span>
        {applied && (
          <Check className="mt-0.5 w-3.5 h-3.5 text-lefot-text-secondary shrink-0" />
        )}
      </div>
      {option.reason && (
        <span className="text-lefot-text-secondary text-xs leading-relaxed">
          {option.reason}
        </span>
      )}
    </button>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-lefot-text-secondary">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
