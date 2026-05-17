"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Copy, Check, Trash, BracesIcon } from "lucide-react";

import { getSeparator, cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { TooltipButton } from "@/components/tooltip-button";
import { Spinner } from "@/components/ui/spinner";

import { BilingualView } from "./bilingual-view";
import { LanguageCombobox } from "./language-combobox";
import { GuidelineDialog } from "./guideline-dialog";
import { ContextPanel } from "./context-panel";

import { useTranslation } from "@/hooks/useTranslation";
import { useRestructure } from "@/hooks/useRestructure";
import { useProjectStore } from "@/store/useProjectStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUIStore } from "@/store/useUIStore";

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
  const [hasCopied, setHasCopied] = React.useState(false);
  const hasGuideline = guideline.length > 0;

  const { isTranslating, streamingContent, handleTranslate } = useTranslation({
    projectId,
    projectData,
    settings,
    targetLanguage,
    guideline,
    updateProject,
    updateLastTargetLanguage,
    setProjectTitle,
  });

  const { isRestructuring, handleRestructure } = useRestructure({
    projectId,
    projectData,
    settings,
    updateProject,
  });

  const canRestructure = !!projectData?.pages?.[0]?.snapshot?.translation;

  // 가이드라인 저장 처리
  const handleSaveGuideline = (newGuideline: string) => {
    setGuideline(newGuideline);
    updateProject(projectId, { guideline: newGuideline });
  };

  const [doubleChecked, setDoubleChecked] = React.useState(false);
  const [deleteTooltipOpen, setDeleteTooltipOpen] = React.useState(false);

  // 삭제 로직
  const handleDelete = () => {
    if (!doubleChecked) {
      return;
    }

    deleteProject(projectId);
    router.push("/");
  };

  // 타겟 언어 변경 핸들러
  const handleLanguageChange = (newLang: string) => {
    setTargetLanguage(newLang);
    updateProject(projectId, { targetLanguage: newLang });
  };

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

  /**
   * 자동 번역 트리거:
   * /new 에서 Translate 버튼을 누르면 p/[id] 페이지로 이동하며 autoTranslate=true 쿼리 파라미터가 붙음
   */
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

    const page = projectData.pages[0];
    const lang =
      projectData.translationStats?.usedLanguage ?? projectData.targetLanguage;
    const allTargetText = page.value
      .map((s, index) => {
        const sep = getSeparator(lang);
        let suffix = sep;
        if (s.lineBreaks === 1) suffix = "\n";
        if (s.lineBreaks === 2) suffix = "\n\n";
        if (index === page.value.length - 1 && !s.lineBreaks) suffix = "";
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
      if (!projectData) return;
      const page = projectData.pages[0];
      const updatedPage = { ...page, sourceText: newSource, isSynced: false };
      updateProject(projectId, {
        pages: [updatedPage, ...projectData.pages.slice(1)],
      });
    },
    [projectId, projectData, updateProject],
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
      {/* Main column: header + bilingualview + footer */}
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

        <BilingualView
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
            <TooltipButton>
              <TooltipButton.Trigger
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
              </TooltipButton.Trigger>
              <TooltipButton.Content>Copy</TooltipButton.Content>
            </TooltipButton>

            <TooltipButton>
              <TooltipButton.Trigger
                size="icon"
                variant="outline"
                onClick={handleRestructure}
                disabled={!canRestructure || isRestructuring || isTranslating}
              >
                {isRestructuring ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <BracesIcon className="w-4 h-4" />
                )}
              </TooltipButton.Trigger>
              <TooltipButton.Content>Restructure</TooltipButton.Content>
            </TooltipButton>

            <TooltipButton
              open={deleteTooltipOpen || doubleChecked}
              onOpenChange={(open) => {
                if (!doubleChecked) setDeleteTooltipOpen(open);
              }}
            >
              <TooltipButton.Trigger
                size="icon"
                className={cn(
                  "border",
                  doubleChecked
                    ? "border-lefot-border-danger text-lefot-text-danger hover:bg-lefot-bg-danger-hover active:bg-lefot-bg-danger-pressed"
                    : "bg-transparent border-lefot-border text-lefot-icon hover:bg-lefot-bg-danger active:bg-lefot-bg-danger",
                )}
                onClick={
                  doubleChecked ? handleDelete : () => setDoubleChecked(true)
                }
                onMouseLeave={() => setDoubleChecked(false)}
              >
                <Trash className="w-4 h-4" />
              </TooltipButton.Trigger>
              <TooltipButton.Content>
                {doubleChecked ? "Click again to confirm" : "Delete"}
              </TooltipButton.Content>
            </TooltipButton>
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
