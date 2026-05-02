"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Brain, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingBlockProps {
  thinking: string;
  checklist: string;
  hasThinkingTokens: boolean;
  isStreaming: boolean;
  startTime: number;
  textStartTime: number | null;
}

export function ThinkingBlock({
  thinking,
  checklist,
  hasThinkingTokens,
  isStreaming,
  startTime,
  textStartTime,
}: ThinkingBlockProps) {
  // 출력 지연: 로딩 착시 효과
  const [isVisible, setIsVisible] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 450);
    return () => clearTimeout(t);
  }, []);

  // 실제 컨텐츠 존재 여부 (thinking 토큰 또는 checklist)
  const hasContent = hasThinkingTokens || checklist.length > 0;
  const canExpand = hasContent;

  const [isExpanded, setIsExpanded] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // thinking 토큰 도착 시 자동 펼침
  React.useEffect(() => {
    if (hasThinkingTokens && thinking) {
      setIsExpanded(true);
    }
  }, [hasThinkingTokens, thinking]);

  // checklist 도착 시 펼침 (streaming 종료 직후 한 번만)
  const prevChecklist = React.useRef("");
  React.useEffect(() => {
    if (checklist && !prevChecklist.current) {
      setIsExpanded(true);
    }
    prevChecklist.current = checklist;
  }, [checklist]);

  // streaming 완료 후 자동 접힘
  React.useEffect(() => {
    if (!isStreaming) {
      const t = setTimeout(() => setIsExpanded(false), 800);
      return () => clearTimeout(t);
    }
  }, [isStreaming]);

  // 스트리밍 중 자동 스크롤
  React.useEffect(() => {
    if (isStreaming && isExpanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [thinking, isStreaming, isExpanded]);

  // 경과 시간 계산
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    // text가 아직 안 왔고 streaming 중일 때만 live timer
    if (!isStreaming || textStartTime !== null) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [isStreaming, textStartTime]);

  // streaming 종료 시 최종 elapsed 캡처
  const [capturedElapsed, setCapturedElapsed] = React.useState<number | null>(
    null,
  );
  React.useEffect(() => {
    if (!isStreaming && capturedElapsed === null) {
      const end = textStartTime ?? Date.now();
      setCapturedElapsed(end - startTime);
    }
  }, [isStreaming, capturedElapsed, textStartTime, startTime]);

  const elapsed =
    capturedElapsed !== null
      ? capturedElapsed
      : textStartTime !== null
        ? textStartTime - startTime
        : now - startTime;

  const formatElapsed = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  if (!isVisible) return null;

  return (
    <div className="mb-3 border border-border rounded-md overflow-hidden text-xs">
      {/* Header */}
      <button
        type="button"
        onClick={() => canExpand && setIsExpanded((v) => !v)}
        disabled={!canExpand}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 w-full text-muted-foreground text-left transition-colors",
          canExpand
            ? "bg-muted/40 hover:bg-muted/70"
            : "bg-muted/20 cursor-default",
        )}
      >
        {canExpand ? (
          isExpanded ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )
        ) : (
          <Lock className="opacity-50 w-3 h-3 shrink-0" />
        )}
        <Brain className="w-3 h-3 shrink-0" />
        <span className="font-medium">
          {isStreaming ? "Thinking..." : "Thought"}
        </span>
        {isStreaming && (
          <span className="flex gap-0.5 ml-1">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse" style={{ animationDelay: "150ms" }}>
              ●
            </span>
            <span className="animate-pulse" style={{ animationDelay: "300ms" }}>
              ●
            </span>
          </span>
        )}
        {!canExpand && !isStreaming && (
          <span className="opacity-50 ml-1 italic">content not available</span>
        )}
        {!canExpand && isStreaming && (
          <span className="opacity-50 ml-1 italic">not exposed by model</span>
        )}
        <span
          className={cn(
            "ml-auto tabular-nums",
            isStreaming && !capturedElapsed && "opacity-60",
          )}
        >
          {formatElapsed(elapsed)}
        </span>
      </button>

      {/* Content */}
      {isExpanded && hasContent && (
        <div
          ref={contentRef}
          className="bg-muted/20 px-3 py-2 border-border border-t max-h-48 overflow-y-auto text-muted-foreground leading-relaxed"
        >
          {thinking && <div className="whitespace-pre-wrap">{thinking}</div>}
          {checklist && (
            <div className={cn("whitespace-pre-wrap", thinking && "mt-2")}>
              {checklist}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
