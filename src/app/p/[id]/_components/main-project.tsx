"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Check, Trash } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Workspace } from "./workspace";
import type { StreamingContent } from "./workspace";
import { LanguageCombobox, languages } from "./language-combobox";
import { GuidelineDialog } from "./guideline-dialog";
import { ContextPanel } from "./context-panel";

import { useProjectStore } from "@/store/useProjectStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUIStore } from "@/store/useUIStore";
import { translateWithModels } from "@/lib/api/translate";
import { getSeparator } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export function ProjectMain() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    getProjectById,
    updateProject,
    deleteProject,
    isHydrated: isProjectHydrated,
  } = useProjectStore();
  const {
    settings,
    updateLastTargetLanguage,
    isHydrated: isSettingsHydrated,
  } = useSettingsStore();
  const { isPanelOpen } = useUIStore();

  const projectData = getProjectById(projectId);

  const [projectTitle, setProjectTitle] = React.useState("");
  const [guideline, setGuideline] = React.useState("");

  // 번역 타겟 언어 상태 관리
  const [targetLanguage, setTargetLanguage] = React.useState(
    settings.lastTargetLanguage || "ko",
  );
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [hasCopied, setHasCopied] = React.useState(false);
  const [streamingContent, setStreamingContent] =
    React.useState<StreamingContent | null>(null);
  const hasGuideline = guideline.length > 0;

  // 가이드라인 저장 처리
  const handleSaveGuideline = (newGuideline: string) => {
    setGuideline(newGuideline);
    updateProject(projectId, { guideline: newGuideline });
  };

  // 삭제 로직
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      deleteProject(projectId);
      router.push("/");
    }
  };

  // 타겟 언어 변경 핸들러
  const handleLanguageChange = (newLang: string) => {
    setTargetLanguage(newLang);
    updateProject(projectId, { targetLanguage: newLang });
  };

  // 3. 번역 시작 로직
  const handleTranslate = React.useCallback(async () => {
    if (!projectData?.sourceText || projectData.sourceText.trim() === "") {
      toast.error("Please enter some text to translate.");
      return;
    }

    // 타겟 언어 라벨 가져오기
    const targetLanguageLabel =
      languages.find((l) => l.value === targetLanguage)?.label ||
      targetLanguage;

    // 번역 시작 전: SourceText 앞 128자를 title로 자동 세팅
    const autoTitle = projectData.sourceText
      .slice(0, 128)
      .replace(/\n/g, " ")
      .trim();
    updateProject(projectId, { title: autoTitle });
    setProjectTitle(autoTitle);

    setIsTranslating(true);
    setStreamingContent({
      thinking: "",
      checklist: "",
      text: "",
      isStreaming: true,
      hasThinkingTokens: false,
      startTime: Date.now(),
      textStartTime: null,
    });

    // 번역에 사용할 main model code 미리 추출
    const usedMainModel =
      settings.model.find((m) => m.role === "main")?.code ?? "";

    // <checklist> 실시간 파싱: raw 누적 텍스트 ref
    const rawTextAccum = { current: "" };

    const parseStreamingText = (
      raw: string,
    ): { displayText: string; checklistText: string } => {
      const OPEN = "<checklist>";
      const CLOSE = "</checklist>";
      const openIdx = raw.indexOf(OPEN);
      if (openIdx === -1) return { displayText: raw, checklistText: "" };
      const before = raw.slice(0, openIdx);
      const afterOpen = raw.slice(openIdx + OPEN.length);
      const closeIdx = afterOpen.indexOf(CLOSE);
      if (closeIdx === -1) {
        // 태그 닫히지 않음 — checklist 누적, 화면엔 before만
        return { displayText: before, checklistText: afterOpen };
      }
      // 태그 완료 — before + </checklist> 이후 텍스트
      return {
        displayText: before + afterOpen.slice(closeIdx + CLOSE.length),
        checklistText: afterOpen.slice(0, closeIdx),
      };
    };

    try {
      // 마지막 사용 언어 기억
      updateLastTargetLanguage(targetLanguage);

      const { formattedData, rawTranslatedText, stats } =
        await translateWithModels({
          settings,
          sourceText: projectData.sourceText,
          targetLanguageLabel,
          guideline,
          onStream: (chunk) => {
            if (chunk.type === "thinking") {
              setStreamingContent((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  thinking: prev.thinking + chunk.text,
                  hasThinkingTokens: true,
                };
              });
              return;
            }
            // text 청크: ref 누적과 파싱은 setState 밖에서 (StrictMode 이중 호출 방지)
            rawTextAccum.current += chunk.text;
            const { displayText, checklistText } = parseStreamingText(
              rawTextAccum.current,
            );
            setStreamingContent((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                text: displayText,
                checklist: checklistText,
                textStartTime: prev.textStartTime ?? Date.now(),
              };
            });
          },
          onPhaseChange: (phase, _rawResult, phaseStats) => {
            if (phase === "formatting") {
              // Step 1 완료 — streaming 종료
              setStreamingContent((prev) =>
                prev ? { ...prev, isStreaming: false } : prev,
              );
              if (phaseStats) {
                toast.success("Main translation completed", {
                  description: `Took ${(phaseStats.durationMs / 1000).toFixed(1)}s. In: ${phaseStats.input}, Out: ${phaseStats.output}`,
                });
              }
            }
          },
        });

      // 결과를 스토어에 업데이트
      const sep = getSeparator(targetLanguage);
      const syncedSourceText = formattedData
        .map((s, index) => {
          let suffix = sep;
          if (s.lineBreaks === 1) suffix = "\n";
          if (s.lineBreaks === 2) suffix = "\n\n";
          if (index === formattedData.length - 1 && !s.lineBreaks) suffix = "";
          return s.source.trimEnd() + suffix;
        })
        .join("");

      updateProject(projectId, {
        targetLanguage,
        value: formattedData,
        sourceText: syncedSourceText,
        isSynced: true,
        rawTranslation: rawTranslatedText,
        translationStats: {
          ...stats,
          usedMainModel,
          usedLanguage: targetLanguage,
        },
      });

      // 번역 완료 → streamingContent 제거 (data.value 렌더로 교체됨)
      setStreamingContent(null);

      toast.success("Formatting completed", {
        description: `Total duration: ${(stats.durationMs / 1000).toFixed(1)}s. Input: ${stats.subModelTokens.input}, Output: ${stats.subModelTokens.output}`,
      });
    } catch (error: any) {
      setStreamingContent(null);
      toast.error(`Translation failed`, {
        description: error.message,
      });
    } finally {
      setIsTranslating(false);
    }
  }, [
    settings,
    projectData?.sourceText,
    targetLanguage,
    guideline,
    projectId,
    updateProject,
    updateLastTargetLanguage,
  ]);

  // 데이터 로드 시 초기화 (프로젝트가 바뀌거나 하이드레이션이 완료되었을 때만)
  React.useEffect(() => {
    if (projectData && isProjectHydrated && isSettingsHydrated) {
      setProjectTitle(projectData.title);
      setGuideline(projectData.guideline || "");
      setTargetLanguage(
        projectData.targetLanguage || settings.lastTargetLanguage || "ko",
      );
    }
  }, [projectId, isProjectHydrated, isSettingsHydrated]);

  // 자동 번역 파라미터 감지 후 즉시 실행 (단 1회)
  const hasAutoTranslated = React.useRef(false);
  React.useEffect(() => {
    if (
      searchParams?.get("autoTranslate") === "true" &&
      projectData &&
      isSettingsHydrated &&
      !hasAutoTranslated.current
    ) {
      hasAutoTranslated.current = true;
      handleTranslate();
      // URL에서 파라미터 지우기 (새로고침 시 재번역 방지)
      router.replace(`/p/${projectId}`);
    }
  }, [
    searchParams,
    projectData,
    isSettingsHydrated,
    handleTranslate,
    router,
    projectId,
  ]);

  const handleCopyTargetText = () => {
    if (!projectData) return;

    const allTargetText = projectData.value
      .map((s, index) => {
        const sep = getSeparator(
          projectData.translationStats?.usedLanguage ??
            projectData.targetLanguage,
        );
        let suffix = sep;
        if (s.lineBreaks === 1) suffix = "\n";
        if (s.lineBreaks === 2) suffix = "\n\n";
        if (index === projectData.value.length - 1 && !s.lineBreaks)
          suffix = "";
        return s.target.trimEnd() + suffix;
      })
      .join("");

    navigator.clipboard.writeText(allTargetText);
    setHasCopied(true);
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  };

  const handleSourceChange = React.useCallback(
    (newSource: string) => {
      updateProject(projectId, { sourceText: newSource, isSynced: false });
    },
    [projectId, updateProject],
  );

  if (!isProjectHydrated || !isSettingsHydrated) {
    return (
      <div className="flex flex-1 justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="flex flex-1 justify-center items-center h-screen">
        Project not found
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-screen overflow-hidden">
      {/* Main column: header + workspace + footer */}
      <div className="flex flex-col flex-1 bg-lefot-bg-secondary min-w-0">
        {/* Header */}
        <header className="flex items-center gap-4 bg-lefot-bg border-lefot-border border-b border-l shrink-0">
          {/* Title Area */}
          <div className="flex justify-between items-center mx-6 my-3.5 w-full">
            <div className="flex w-full max-w-100 h-fit">
              <h1 className="items-center font-bold text-lg line-clamp-1">
                {projectTitle}
              </h1>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <LanguageCombobox
                value={targetLanguage}
                onValueChange={handleLanguageChange}
              />
              <Button
                size="lg"
                variant="primary"
                className="gap-2 w-34"
                onClick={handleTranslate}
                disabled={isTranslating}
              >
                {isTranslating ? <Spinner className="w-6 h-6" /> : "Translate"}
              </Button>
            </div>
          </div>
        </header>

        <Workspace
          data={projectData}
          onSourceChange={handleSourceChange}
          streamingContent={streamingContent}
        />

        {/* Footer */}
        <footer className="flex justify-between items-center bg-lefot-bg px-4 py-2 border-lefot-border border-t border-l shrink-0">
          <GuidelineDialog
            hasGuideline={hasGuideline}
            value={guideline}
            onSave={handleSaveGuideline}
          />
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopyTargetText}
              disabled={hasCopied}
            >
              {hasCopied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={handleDelete}
              className="hover:bg-lefot-bg-danger-hover active:bg-lefot-bg-danger-pressed hover:text-lefot-icon-danger active:text-lefot-icon-danger"
            >
              <Trash />
            </Button>
          </div>
        </footer>
      </div>

      {/* Context panel: slide in from the right */}
      <div
        className={cn(
          "overflow-hidden transition-[width] duration-300 ease-in-out shrink-0",
          isPanelOpen ? "w-80" : "w-0",
        )}
      >
        <ContextPanel data={projectData} />
      </div>
    </div>
  );
}
