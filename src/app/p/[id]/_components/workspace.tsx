"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import Editor from "react-simple-code-editor";

import { AddonPopover } from "./addon-popover";
import { ThinkingBlock } from "./thinking-block";
import { cn } from "@/lib/utils";
import { getSeparator } from "@/lib/utils";
import { ProjectData } from "@/store/useProjectStore";
import { useUIStore } from "@/store/useUIStore";

export interface StreamingContent {
  thinking: string;
  checklist: string;
  text: string;
  isStreaming: boolean;
  hasThinkingTokens: boolean;
  startTime: number;
  textStartTime: number | null;
}

interface WorkspaceProps {
  data: ProjectData;
  onSourceChange?: (newSource: string) => void;
  streamingContent?: StreamingContent | null;
}

export function Workspace({
  data,
  onSourceChange,
  streamingContent,
}: WorkspaceProps) {
  // 에디터 입력 전용 로컬 상태
  const [sourceText, setSourceText] = React.useState(data.sourceText || "");

  // Right Panel에 렌더링할 데이터가 있는지 판별
  const showResult = data.value && data.value.length > 0;
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  const { selectedChunkId, isPanelOpen, popoverOpenChunkId } = useUIStore();
  // hover > popover open > panel selected
  const activeHighlightId =
    hoveredId ?? popoverOpenChunkId ?? (isPanelOpen ? selectedChunkId : null);

  // 부모로부터 데이터가 바뀌면 (예: 번역 완료 후) 로컬 상태 갱신
  React.useEffect(() => {
    setSourceText(data.sourceText || "");
  }, [data.sourceText]);

  // 언마운트 시점에 최종 텍스트 저장 (필요시)
  const sourceRef = React.useRef(sourceText);
  React.useEffect(() => {
    sourceRef.current = sourceText;
  }, [sourceText]);

  // HTML 태그 이스케이프 헬퍼
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  // Left Panel 에디터용 하이라이팅 렌더러
  const highlightSource = (code: string) => {
    // 1. 동기화가 깨진 상태이거나
    // 2. 타이핑을 해서 초기값(스토어값)과 달라졌다면 하이라이팅 중단
    if (!data.isSynced || code !== data.sourceText) {
      return escapeHtml(code);
    }

    // 번역 결과 데이터가 있을 때만 문장 단위 분할 렌더링
    if (data.value && data.value.length > 0) {
      return data.value
        .map((s, sIdx) => {
          const isHovered = activeHighlightId === s.id;
          const newLocal =
            "box-decoration-clone bg-lefot-bg-highlight-hover rounded-sm transition-colors";
          const className = isHovered ? newLocal : "transition-colors";

          let suffix = " ";
          if (s.lineBreaks === 1) suffix = "\n";
          if (s.lineBreaks === 2) suffix = "\n\n";
          if (sIdx === data.value.length - 1 && !s.lineBreaks) suffix = ""; // 마지막은 공백 제거

          return `<span key="${s.id || `s-${sIdx}`}" class="${className}">${escapeHtml(s.source)}</span>${escapeHtml(suffix)}`;
        })
        .join("");
    }

    return escapeHtml(code);
  };

  return (
    <div className="flex-1 bg-lefot-bg-secondary overflow-y-auto [scrollbar-gutter:stable]">
      <div className="flex items-stretch min-h-full">
        {/* Left Pane - Source */}
        <div className="relative flex flex-col gap-2 p-4 border-lefot-border border-l w-1/2 min-h-full">
          <Editor
            value={sourceText}
            onValueChange={(code) => {
              setSourceText(code);
              // 동기화 상태가 깨진 것만 즉시 부모에게 알림
              if (data.isSynced && code !== data.sourceText) {
                onSourceChange?.(code); // isSynced를 false로 만들기 위해 한 번 호출
              }
            }}
            onBlur={() => {
              // 에디터에서 포커스가 빠져나갈 때 최종 텍스트 저장
              if (sourceText !== data.sourceText) {
                onSourceChange?.(sourceText);
              }
            }}
            highlight={highlightSource}
            padding={0} // p-4 와 동일 (1rem = 16px)
            style={{
              fontFamily: "inherit", // 코드 에디터 기본 폰트(Monospace) 무효화
              lineHeight: "1.625", // leading-relaxed
            }}
            className="w-full h-full text-foreground text-lg source-editor"
            textareaClassName="focus:outline-none resize-none break-normal!"
          />
        </div>

        {/* Right Pane - Result */}
        <div className="flex flex-col border-lefot-border border-l w-1/2 overflow-y-auto">
          <div className="p-4 min-h-full">
            {/* Streaming overlay: thinking block + live text. 번역 완료 후 showResult로 교체 */}
            {streamingContent ? (
              <div className="text-foreground text-lg leading-relaxed">
                <ThinkingBlock
                  thinking={streamingContent.thinking}
                  checklist={streamingContent.checklist}
                  hasThinkingTokens={streamingContent.hasThinkingTokens}
                  isStreaming={streamingContent.isStreaming}
                  startTime={streamingContent.startTime}
                  textStartTime={streamingContent.textStartTime}
                />
                <span className="whitespace-pre-wrap">
                  {streamingContent.text}
                </span>
              </div>
            ) : showResult ? (
              <div className="text-foreground text-lg leading-relaxed whitespace-pre-wrap">
                {data.value.map((sentence, sIdx) => (
                  <React.Fragment key={sentence.id || `s-${sIdx}`}>
                    <AddonPopover sentence={sentence}>
                      <span
                        className={cn(
                          "box-decoration-clone rounded-sm transition-colors cursor-pointer",
                          hoveredId === sentence.id
                            ? "bg-lefot-bg-highlight-hover"
                            : activeHighlightId === sentence.id
                              ? "bg-lefot-bg-highlight-hover"
                              : "hover:bg-lefot-bg-highlight-hover",
                        )}
                        onMouseEnter={() => setHoveredId(sentence.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {sentence.target}
                      </span>
                    </AddonPopover>
                    {sentence.lineBreaks === 1 && <br />}
                    {sentence.lineBreaks === 2 && (
                      <>
                        <br />
                        <br />
                      </>
                    )}
                    {(!sentence.lineBreaks || sentence.lineBreaks === 0) &&
                      sIdx !== data.value.length - 1 &&
                      getSeparator(
                        data.translationStats?.usedLanguage ??
                          data.targetLanguage,
                      )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center h-full min-h-100 text-muted-foreground">
                <FileText className="opacity-50 mb-4 w-12 h-12" />
                <p className="text-sm">Enter text and click translate...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
