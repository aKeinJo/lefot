"use client";

import * as React from "react";
import { toast } from "sonner";
import { getSeparator } from "@/lib/utils";
import { translateWithModels } from "@/lib/api/translate";
import { languages } from "@/app/p/[id]/_components/language-combobox";
import type { ProjectData } from "@/store/useProjectStore";
import type { SettingValue } from "@/store/useSettingsStore";
import type { StreamingContent } from "@/app/p/[id]/_components/bilingual-view";

interface UseTranslationParams {
  projectId: string;
  projectData: ProjectData | undefined;
  settings: SettingValue;
  targetLanguage: string;
  guideline: string;
  updateProject: (id: string, updates: Partial<Omit<ProjectData, "id">>) => void;
  updateLastTargetLanguage: (lang: string) => void;
  setProjectTitle: (title: string) => void;
}

function parseStreamingText(raw: string): { displayText: string; checklistText: string } {
  const OPEN = "<checklist>";
  const CLOSE = "</checklist>";
  const openIdx = raw.indexOf(OPEN);
  if (openIdx === -1) return { displayText: raw, checklistText: "" };
  const before = raw.slice(0, openIdx);
  const afterOpen = raw.slice(openIdx + OPEN.length);
  const closeIdx = afterOpen.indexOf(CLOSE);
  if (closeIdx === -1) return { displayText: before, checklistText: afterOpen };
  return {
    displayText: before + afterOpen.slice(closeIdx + CLOSE.length),
    checklistText: afterOpen.slice(0, closeIdx),
  };
}

export function useTranslation({
  projectId,
  projectData,
  settings,
  targetLanguage,
  guideline,
  updateProject,
  updateLastTargetLanguage,
  setProjectTitle,
}: UseTranslationParams) {
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState<StreamingContent | null>(null);

  const handleTranslate = React.useCallback(async () => {
    const sourceText = projectData?.pages?.[0]?.sourceText ?? "";
    if (!sourceText || sourceText.trim() === "") {
      toast.error("Please enter some text to translate.");
      return;
    }

    const targetLanguageLabel =
      languages.find((l) => l.value === targetLanguage)?.label || targetLanguage;

    const autoTitle = sourceText.slice(0, 128).replace(/\n/g, " ").trim();
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

    const usedMainModel = settings.model.find((m) => m.role === "main")?.code ?? "";
    const rawTextAccum = { current: "" };

    try {
      updateLastTargetLanguage(targetLanguage);

      const { formattedData, rawTranslatedText, stats } = await translateWithModels({
        settings,
        sourceText,
        targetLanguageLabel,
        guideline,
        onStream: (chunk) => {
          if (chunk.type === "thinking") {
            setStreamingContent((prev) => {
              if (!prev) return prev;
              return { ...prev, thinking: prev.thinking + chunk.text, hasThinkingTokens: true };
            });
            return;
          }
          rawTextAccum.current += chunk.text;
          const { displayText, checklistText } = parseStreamingText(rawTextAccum.current);
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
            setStreamingContent((prev) => (prev ? { ...prev, isStreaming: false } : prev));
            if (phaseStats) {
              toast.success("Main translation completed", {
                description: `Took ${(phaseStats.durationMs / 1000).toFixed(1)}s. In: ${phaseStats.input}, Out: ${phaseStats.output}`,
              });
            }
          }
        },
      });

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

      const currentPage = projectData!.pages[0];
      const updatedPage = {
        ...currentPage,
        sourceText: syncedSourceText,
        snapshot: { source: sourceText, translation: rawTranslatedText },
        isSynced: true,
        value: formattedData,
      };
      updateProject(projectId, {
        targetLanguage,
        pages: [updatedPage, ...projectData!.pages.slice(1)],
        translationStats: { ...stats, usedMainModel, usedLanguage: targetLanguage },
      });

      setStreamingContent(null);

      toast.success("Formatting completed", {
        description: `Total duration: ${(stats.durationMs / 1000).toFixed(1)}s. Input: ${stats.subModelTokens.input}, Output: ${stats.subModelTokens.output}`,
      });
    } catch (error: any) {
      setStreamingContent(null);
      toast.error("Translation failed", { description: error.message });
    } finally {
      setIsTranslating(false);
    }
  }, [
    settings,
    projectData?.pages?.[0]?.sourceText,
    targetLanguage,
    guideline,
    projectId,
    updateProject,
    updateLastTargetLanguage,
    setProjectTitle,
  ]);

  return { isTranslating, streamingContent, handleTranslate };
}
