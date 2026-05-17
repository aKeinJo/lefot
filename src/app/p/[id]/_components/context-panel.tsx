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
import { cn } from "@/lib/utils";

import { ProjectData } from "@/store/useProjectStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUIStore, PanelMode } from "@/store/useUIStore";
import { InputGroup, InputGroupTextarea } from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { useRetranslate } from "@/hooks/useRetranslate";
import { useContextChat } from "@/hooks/useContextChat";

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

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const selectedSentence =
    data.pages[0]?.value?.find((s) => s.id === selectedChunkId) ?? null;

  const handleClose = () => {
    setIsPanelOpen(false);
  };

  const {
    input,
    setInput,
    isLoading,
    appliedSuggestions,
    scrollRef,
    handleSend,
    handleApply,
    handleKeyDown,
  } = useContextChat({
    data,
    selectedChunkId,
    selectedSentence,
    settings,
    panelMode,
    isPanelOpen,
    pendingContext,
    setPendingContext,
    updateProject,
  });

  const chatMode: "explain" | "suggest" =
    panelMode === "suggest" ? "suggest" : "explain";

  const {
    editMode,
    setEditMode,
    retransSource,
    setRetransSource,
    retransResult,
    isRetranslating,
    userNote,
    setUserNote,
    isAdvancedOpen,
    setIsAdvancedOpen,
    directSource,
    setDirectSource,
    directTarget,
    setDirectTarget,
    handleRetranslate,
    handleApplyRetranslate,
    handleApplyDirect,
  } = useRetranslate({
    data,
    selectedChunkId,
    selectedSentence,
    settings,
    updateProject,
  });

  // panelMode가 retranslate로 바뀌면 editMode 리셋
  React.useEffect(() => {
    if (panelMode === "retranslate") {
      setEditMode("retranslate");
    }
  }, [panelMode, selectedChunkId, setEditMode]);

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
