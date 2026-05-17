"use client";

import * as React from "react";
import { toast } from "sonner";
import { getSeparator } from "@/lib/utils";
import { callRetranslateModel } from "@/lib/api/chat";
import { languages } from "@/app/p/[id]/_components/language-combobox";
import type { ProjectData, Sentence } from "@/store/useProjectStore";
import type { SettingValue } from "@/store/useSettingsStore";

interface UseRetranslateParams {
  data: ProjectData;
  selectedChunkId: string | null;
  selectedSentence: Sentence | null;
  settings: SettingValue;
  updateProject: (id: string, updates: Partial<Omit<ProjectData, "id">>) => void;
}

export function useRetranslate({
  data,
  selectedChunkId,
  selectedSentence,
  settings,
  updateProject,
}: UseRetranslateParams) {
  type EditMode = "retranslate" | "direct";
  const [editMode, setEditMode] = React.useState<EditMode>("retranslate");
  const [retransSource, setRetransSource] = React.useState("");
  const [retransResult, setRetransResult] = React.useState("");
  const [isRetranslating, setIsRetranslating] = React.useState(false);
  const [userNote, setUserNote] = React.useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);
  const [directSource, setDirectSource] = React.useState("");
  const [directTarget, setDirectTarget] = React.useState("");

  // 청크 변경 시 소스·결과 초기화
  React.useEffect(() => {
    if (selectedSentence) {
      setRetransSource(selectedSentence.source);
      setDirectSource(selectedSentence.source);
      setDirectTarget(selectedSentence.target);
      setRetransResult("");
    }
  }, [selectedChunkId, selectedSentence?.source, selectedSentence?.target]);

  const applyEdit = React.useCallback(
    (newSource: string, newTarget: string) => {
      if (!selectedSentence) return;
      const page = data.pages[0];
      const lang = data.translationStats?.usedLanguage ?? data.targetLanguage;
      const sep = getSeparator(lang);
      const newValue = page.value.map((s) =>
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
          return s.source.trimEnd() + suffix;
        })
        .join("");
      const updatedPage = { ...page, value: newValue, sourceText: newSourceText, isSynced: true };
      updateProject(data.id, { pages: [updatedPage, ...data.pages.slice(1)] });
    },
    [data, selectedChunkId, selectedSentence, updateProject],
  );

  const handleRetranslate = async () => {
    if (!selectedSentence || isRetranslating) return;
    setIsRetranslating(true);
    setRetransResult("");

    const page = data.pages[0];
    const sentenceIdx = page.value.findIndex((s) => s.id === selectedChunkId);
    const contextBefore = page.value
      .slice(Math.max(0, sentenceIdx - 2), sentenceIdx)
      .map((s) => s.target);
    const contextAfter = page.value
      .slice(sentenceIdx + 1, sentenceIdx + 3)
      .map((s) => s.target);

    const usedLang = data.translationStats?.usedLanguage ?? data.targetLanguage;
    const targetLanguageLabel = languages.find((l) => l.value === usedLang)?.label ?? usedLang;

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

  return {
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
  };
}
