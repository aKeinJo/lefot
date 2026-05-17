"use client";

import * as React from "react";
import { toast } from "sonner";
import { ProjectData } from "@/store/useProjectStore";
import { SettingValue } from "@/store/useSettingsStore";
import { callFormattingModel } from "@/lib/api/translate";

interface UseRestructureParams {
  projectId: string;
  projectData: ProjectData | undefined;
  settings: SettingValue;
  updateProject: (id: string, updates: Partial<Omit<ProjectData, "id">>) => void;
}

interface UseRestructureReturn {
  isRestructuring: boolean;
  handleRestructure: () => Promise<void>;
}

export function useRestructure({
  projectId,
  projectData,
  settings,
  updateProject,
}: UseRestructureParams): UseRestructureReturn {
  const [isRestructuring, setIsRestructuring] = React.useState(false);

  const handleRestructure = React.useCallback(async () => {
    const page = projectData?.pages?.[0];
    if (!page?.snapshot?.translation) return;
    if (isRestructuring) return;

    setIsRestructuring(true);
    try {
      const { formattedData } = await callFormattingModel({
        settings,
        sourceText: page.snapshot.source,
        rawTranslation: page.snapshot.translation,
        isStructureRetry: true,
      });

      const updatedPage = { ...page, value: formattedData, isSynced: true };
      updateProject(projectId, {
        pages: [updatedPage, ...(projectData!.pages.slice(1))],
      });

      toast.success("Structure updated");
    } catch (err: any) {
      toast.error("Restructure failed", { description: err.message });
    } finally {
      setIsRestructuring(false);
    }
  }, [projectId, projectData, settings, updateProject, isRestructuring]);

  return { isRestructuring, handleRestructure };
}
