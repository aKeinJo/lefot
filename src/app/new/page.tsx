"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { Workspace } from "../p/[id]/_components/workspace";
import {
  LanguageCombobox,
  languages,
} from "../p/[id]/_components/language-combobox";
import { GuidelineDialog } from "../p/[id]/_components/guideline-dialog";
import { Loader2 } from "lucide-react";

import { useProjectStore } from "@/store/useProjectStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function NewProjectMain() {
  const router = useRouter();
  const { addProject, isHydrated: isProjectHydrated } = useProjectStore();
  const {
    settings,
    updateLastTargetLanguage,
    isHydrated: isSettingsHydrated,
  } = useSettingsStore();

  const [guideline, setGuideline] = React.useState("");
  const hasGuideline = guideline.length > 0;

  // 에디터 입력 텍스트 상태 관리
  const [sourceText, setSourceText] = React.useState("");

  // 번역 타겟 언어 상태 관리
  const [targetLanguage, setTargetLanguage] = React.useState(
    settings.lastTargetLanguage || "ko",
  );
  const [isTranslating, setIsTranslating] = React.useState(false);

  const handleSaveGuideline = (newGuideline: string) => {
    setGuideline(newGuideline);
    const trimmedGuideline = newGuideline.trim();
    if (trimmedGuideline) {
      createProjectAndRedirect({ guideline: trimmedGuideline });
    }
  };

  // 헬퍼: 프로젝트 생성 및 리다이렉트
  const createProjectAndRedirect = (
    updates: Partial<Parameters<typeof addProject>[0]>,
    autoTranslate = false,
  ) => {
    const autoTitle =
      sourceText.slice(0, 128).replace(/\n/g, " ").trim() || "Untitled Project";
    const newProjectId = addProject({
      title: autoTitle,
      guideline,
      targetLanguage,
      sourceText,
      isSynced: true,
      value: [],
      ...updates,
    });

    // 자동 번역 플래그를 URL에 붙여서 보냄
    const targetUrl = autoTranslate
      ? `/p/${newProjectId}?autoTranslate=true`
      : `/p/${newProjectId}`;

    toast.success("Project created");
    router.push(targetUrl);
  };

  // 3. 번역 시작 로직 (프로젝트 즉시 생성 후 이동)
  const handleTranslate = () => {
    // API Key가 등록되어 있는지 체크 (우선 Gemini만 지원)
    const geminiApiKey = settings.provider.gemini;
    if (!geminiApiKey || geminiApiKey.trim() === "") {
      toast.error(
        "Gemini API Key is missing. Please configure it in settings first.",
      );
      return;
    }

    if (!sourceText || sourceText.trim() === "") {
      toast.error("Please enter some text to translate.");
      return;
    }

    const mainModel = settings.model.find((m) => m.role === "main")?.code;
    const subModel = settings.model.find((m) => m.role === "sub")?.code;

    if (!mainModel || !subModel) {
      toast.error("Translation models are not fully configured.");
      return;
    }

    // 마지막 사용 언어 기억
    updateLastTargetLanguage(targetLanguage);

    setIsTranslating(true);

    // 번역 로직은 /p/[id]로 위임하고 프로젝트만 즉시 생성
    createProjectAndRedirect({ targetLanguage }, true);
  };

  if (!isProjectHydrated || !isSettingsHydrated) {
    return (
      <div className="flex flex-1 justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-screen">
      {/* Header */}
      <header className="flex bg-lefot-bg border-lefot-border border-b border-l shrink-0">
        {/* Title Area */}
        <div className="flex justify-between items-center gap-4 mx-6 w-full h-16">
          <div className="flex flex-1 items-center truncate">
            <h1 className="-ml-2 px-2 py-1 w-full max-w-160 font-bold text-muted-foreground text-lg truncate leading-tight">
              New Project
            </h1>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <LanguageCombobox
              value={targetLanguage}
              onValueChange={setTargetLanguage}
            />
            <Button
              size="lg"
              variant="primary"
              className="w-32"
              onClick={handleTranslate}
              disabled={isTranslating}
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Translating...
                </>
              ) : (
                "Translate"
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* 빈 데이터를 던져서 초기 Workspace 렌더링 */}
      <Workspace
        data={{
          id: "new",
          title: "",
          guideline: "",
          targetLanguage: "ja",
          sourceText: "",
          isSynced: true,
          value: [],
          updatedAt: Date.now(),
        }}
        onSourceChange={setSourceText}
      />

      {/* Footer */}
      <footer className="flex justify-between items-center px-4 py-2 border-lefot-border border-t border-l shrink-0">
        <GuidelineDialog
          hasGuideline={hasGuideline}
          value={guideline}
          onSave={handleSaveGuideline}
        />
        <div className="flex items-center gap-2"></div>
      </footer>
    </div>
  );
}
