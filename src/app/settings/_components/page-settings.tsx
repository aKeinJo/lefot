"use client";

import * as React from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelCombobox, isKnownModel } from "./model-combobox";

import {
  useSettingsStore,
  SettingValue,
  SYSTEM_DEFAULTS,
} from "@/store/useSettingsStore";

export function SettingsMain() {
  const {
    settings: savedSettings,
    updateSettings,
    updateCustomModelDraft,
    resetModels,
    isHydrated,
  } = useSettingsStore();

  // 폼 내에서 편집 중인 설정 데이터 상태 (저장 전까지 임시 보관)
  const [currentSettings, setCurrentSettings] =
    React.useState<SettingValue | null>(null);

  // 커스텀 모델 모드 여부 (role별)
  const [customMode, setCustomMode] = React.useState<Record<string, boolean>>({
    main: false,
    sub: false,
    feedback: false,
  });

  // 커스텀 모델 입력값 (role별) — 모델 전환 시에도 보존
  const [customDrafts, setCustomDrafts] = React.useState<
    Record<string, string>
  >({
    main: "",
    sub: "",
    feedback: "",
  });

  React.useEffect(() => {
    if (isHydrated) {
      const snap = JSON.parse(JSON.stringify(savedSettings)) as SettingValue;
      setCurrentSettings(snap);
      // customMode: 실제 model.code 기준으로만 결정
      // customDrafts: store에 저장된 값을 불러오되, 현재 활성 커스텀 코드가 있으면 동기화
      const modes: Record<string, boolean> = {};
      const drafts: Record<string, string> = { ...snap.customModelDrafts };
      snap.model.forEach((m) => {
        if (m.code && m.code !== "custom" && !isKnownModel(m.code)) {
          // 실제 저장된 모델이 커스텀 코드 → 커스텀 모드
          modes[m.role] = true;
          drafts[m.role] = m.code;
        } else if (m.code === "custom") {
          modes[m.role] = true;
        }
        // known model이면 customMode = false (draft는 메모리로만 보존)
      });
      setCustomMode((prev) => ({ ...prev, ...modes }));
      setCustomDrafts((prev) => ({ ...prev, ...drafts }));
    }
  }, [savedSettings, isHydrated]);

  // 입력 핸들러: Provider 탭 업데이트
  const handleProviderChange = (
    providerKey: keyof SettingValue["provider"],
    value: string,
  ) => {
    setCurrentSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        provider: {
          ...prev.provider,
          [providerKey]: value,
        },
      };
    });
  };

  // 입력 핸들러: Custom Provider 업데이트
  const handleCustomProviderChange = (
    key: keyof SettingValue["provider"]["custom"],
    value: string,
  ) => {
    setCurrentSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        provider: {
          ...prev.provider,
          custom: {
            ...prev.provider.custom,
            [key]: value,
          },
        },
      };
    });
  };

  // 입력 핸들러: providerOptions (streaming 등) 업데이트
  const handleProviderOptionChange = (
    providerKey: keyof SettingValue["providerOptions"],
    key: string,
    value: boolean,
  ) => {
    setCurrentSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        providerOptions: {
          ...prev.providerOptions,
          [providerKey]: {
            ...prev.providerOptions?.[providerKey],
            [key]: value,
          },
        },
      };
    });
  };

  // 입력 핸들러: 모델 콤보박스 선택 (커스텀 모드 전환 포함)
  const handleModelSelect = (role: string, code: string) => {
    const isCustom = code === "custom";
    const modeUpdates: Record<string, boolean> = { [role]: isCustom };
    // main 변경 시 feedbackUsesMain이면 feedback customMode도 동기화
    if (role === "main" && (currentSettings?.feedbackUsesMain ?? true)) {
      modeUpdates.feedback = isCustom;
    }
    setCustomMode((prev) => ({ ...prev, ...modeUpdates }));
    if (isCustom) {
      handleModelChange(role, customDrafts[role] || "", "Custom Model");
    } else {
      handleModelChange(role, code, "Selected Model");
    }
  };

  // 입력 핸들러: 커스텀 모델 텍스트 입력
  const handleCustomModelInput = (role: string, text: string) => {
    setCustomDrafts((prev) => ({ ...prev, [role]: text }));
    // store 쓰기는 Save 시에만 (키입력마다 하면 savedSettings가 바뀌어 Save 버튼 비활성화됨)
    handleModelChange(role, text, "Custom Model");
  };

  // 입력 핸들러: Model 변경
  const handleModelChange = (role: string, code: string, name: string) => {
    setCurrentSettings((prev) => {
      if (!prev) return prev;
      let newModel = prev.model.map((m) =>
        m.role === role ? { ...m, code, name } : m,
      );
      // main 변경 시 feedbackUsesMain이면 feedback도 동기화
      if (role === "main" && (prev.feedbackUsesMain ?? true)) {
        newModel = newModel.map((m) =>
          m.role === "feedback" ? { ...m, code, name } : m,
        );
      }
      return { ...prev, model: newModel };
    });
  };

  // Feedback Checkbox 변경 핸들러
  const handleFeedbackCheckboxChange = (checked: boolean) => {
    setCurrentSettings((prev) => {
      if (!prev) return prev;
      if (checked) {
        // 메인 모델 코드를 피드백에 복사 — 공백 상태 방지
        const mainEntry = prev.model.find((m) => m.role === "main");
        return {
          ...prev,
          feedbackUsesMain: true,
          model: prev.model.map((m) =>
            m.role === "feedback"
              ? {
                  ...m,
                  code: mainEntry?.code ?? "",
                  name: mainEntry?.name ?? "",
                }
              : m,
          ),
        };
      } else {
        return {
          ...prev,
          feedbackUsesMain: false,
          model: prev.model.map((m) =>
            m.role === "feedback"
              ? {
                  ...m,
                  code: SYSTEM_DEFAULTS.feedbackModel,
                  name: "Gemini 3 Flash Preview",
                }
              : m,
          ),
        };
      }
    });
    setCustomMode((prev) => ({ ...prev, feedback: false }));
  };

  // Save / Cancel / Reset 핸들러
  const handleSave = () => {
    if (!currentSettings) return;
    // 현재 활성 custom draft를 store에 동기화 (페이지 재진입 시 복원용)
    Object.entries(customDrafts).forEach(([role, value]) => {
      if (value) updateCustomModelDraft(role, value);
    });
    updateSettings(currentSettings);
    toast.success("Settings saved successfully.");
  };

  const handleCancel = () => {
    if (!savedSettings) return;
    setCurrentSettings(JSON.parse(JSON.stringify(savedSettings)));
    toast.info("Changes canceled.");
  };

  const handleResetModels = () => {
    resetModels();
    toast.info("Models and prompts reset to system defaults.");
  };

  // 렌더링 전 데이터 로딩 대기
  if (!isHydrated || !currentSettings) {
    return (
      <div className="flex justify-center items-center h-screen text-muted-foreground">
        Loading settings...
      </div>
    );
  }

  // 피드백 모델 사용 여부 파악
  const feedbackModelSettings = currentSettings.model.find(
    (m) => m.role === "feedback",
  );
  const useMainModelForFeedback = currentSettings.feedbackUsesMain ?? true;

  // 변경 사항이 있는지 확인 (JSON 문자열 비교)
  const hasChanges =
    JSON.stringify(savedSettings) !== JSON.stringify(currentSettings);

  // 현재 모델 상태 추출
  const mainModel =
    currentSettings.model.find((m) => m.role === "main")?.code || "";
  const subModel =
    currentSettings.model.find((m) => m.role === "sub")?.code || "";
  const feedbackModel = feedbackModelSettings?.code || "";

  // 시스템 기본값과 다른지 확인 (리셋 버튼 활성화 조건)
  const isModelChangedFromDefault =
    mainModel !== SYSTEM_DEFAULTS.mainModel ||
    subModel !== SYSTEM_DEFAULTS.subModel ||
    useMainModelForFeedback !== SYSTEM_DEFAULTS.useMainForFeedback;

  return (
    <div className="flex flex-col border-lefot-border border-l h-screen overflow-hidden">
      <div className="flex-1 pb-24 overflow-y-auto">
        <div className="mx-auto px-4 py-10 max-w-200">
          <header className="mb-10">
            <h1 className="font-semibold text-4xl">Settings</h1>
            <Label className="flex items-center gap-1 mt-1 text-foreground-subtle text-base">
              This app uses language model services. Please be aware that costs
              may be incurred depending on the model used.
            </Label>
          </header>
          {/* Content */}
          {/* Provider Section */}
          <section className="mb-10">
            <h2 className="mb-6 font-medium text-2xl">Provider</h2>
            <Tabs defaultValue="gemini" className="w-full">
              <TabsList className="grid grid-cols-4 mb-4 w-full">
                <TabsTrigger value="gemini">Gemini</TabsTrigger>
                <TabsTrigger value="claude">Claude</TabsTrigger>
                <TabsTrigger value="gpt">GPT</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>

              <TabsContent value="gemini" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base" htmlFor="gemini-api-key">
                    API Key
                  </Label>
                  <Input
                    id="gemini-api-key"
                    type="text"
                    placeholder="AIzaSy..."
                    value={currentSettings.provider.gemini}
                    onChange={(e) =>
                      handleProviderChange("gemini", e.target.value)
                    }
                  />
                  <div className="flex gap-1.5">
                    <a href="https://aistudio.google.com/">
                      <Button
                        variant="link"
                        size="sm"
                        className="px-0 text-foreground-subtle underline"
                      >
                        Google AI Studio
                      </Button>
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="gemini-streaming"
                    checked={
                      currentSettings.providerOptions?.gemini?.streaming ?? true
                    }
                    onCheckedChange={(v) =>
                      handleProviderOptionChange(
                        "gemini",
                        "streaming",
                        v === true,
                      )
                    }
                  />
                  <Label
                    htmlFor="gemini-streaming"
                    className="text-foreground-subtle text-sm"
                  >
                    Enable Streaming
                  </Label>
                </div>
              </TabsContent>
              <TabsContent value="claude" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base" htmlFor="claude-api-key">
                    API Key
                  </Label>
                  <Input
                    id="claude-api-key"
                    type="text"
                    placeholder="sk-ant-..."
                    value={currentSettings.provider.claude}
                    onChange={(e) =>
                      handleProviderChange("claude", e.target.value)
                    }
                  />
                  <div className="flex gap-1.5">
                    <a href="https://platform.claude.com/">
                      <Button
                        variant="link"
                        size="sm"
                        className="px-0 text-foreground-subtle underline"
                      >
                        Claude Platform
                      </Button>
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="claude-streaming"
                    checked={
                      currentSettings.providerOptions?.claude?.streaming ?? true
                    }
                    onCheckedChange={(v) =>
                      handleProviderOptionChange(
                        "claude",
                        "streaming",
                        v === true,
                      )
                    }
                  />
                  <Label
                    htmlFor="claude-streaming"
                    className="text-foreground-subtle text-sm"
                  >
                    Enable Streaming
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="gpt" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base" htmlFor="gpt-api-key">
                    API Key
                  </Label>
                  <Input
                    id="gpt-api-key"
                    type="text"
                    placeholder="sk-..."
                    value={currentSettings.provider.openAI}
                    onChange={(e) =>
                      handleProviderChange("openAI", e.target.value)
                    }
                  />
                  <div className="flex gap-1.5">
                    <a href="https://platform.openai.com/">
                      <Button
                        variant="link"
                        size="sm"
                        className="px-0 text-foreground-subtle underline"
                      >
                        OpenAI Platform
                      </Button>
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="openai-streaming"
                    checked={
                      currentSettings.providerOptions?.openAI?.streaming ?? true
                    }
                    onCheckedChange={(v) =>
                      handleProviderOptionChange(
                        "openAI",
                        "streaming",
                        v === true,
                      )
                    }
                  />
                  <Label
                    htmlFor="openai-streaming"
                    className="text-foreground-subtle text-sm"
                  >
                    Enable Streaming
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base" htmlFor="custom-apikey">
                    API Key
                  </Label>
                  <Input
                    id="custom-apikey"
                    type="text"
                    placeholder="sk-..."
                    value={currentSettings.provider.custom.apiKey}
                    onChange={(e) =>
                      handleCustomProviderChange("apiKey", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base" htmlFor="custom-url">
                    Request URL
                  </Label>
                  <Input
                    id="custom-url"
                    type="url"
                    placeholder="https://api.example.com/v1"
                    value={currentSettings.provider.custom.requestURL}
                    onChange={(e) =>
                      handleCustomProviderChange("requestURL", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base" htmlFor="custom-format">
                    Format
                  </Label>
                  <Select
                    value={
                      currentSettings.provider.custom.requestFormat || undefined
                    }
                    onValueChange={(val) =>
                      handleCustomProviderChange("requestFormat", val)
                    }
                  >
                    <SelectTrigger id="custom-format" className="w-full">
                      <SelectValue placeholder="Select format..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI Compatible</SelectItem>
                      <SelectItem disabled value="anthropic">
                        Anthropic Claude
                      </SelectItem>
                      <SelectItem disabled value="gemini">
                        Google Gemini
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="custom-streaming"
                    checked={
                      currentSettings.providerOptions?.custom?.streaming ?? true
                    }
                    onCheckedChange={(v) =>
                      handleProviderOptionChange(
                        "custom",
                        "streaming",
                        v === true,
                      )
                    }
                  />
                  <Label
                    htmlFor="custom-streaming"
                    className="text-foreground-subtle text-sm"
                  >
                    Enable Streaming
                  </Label>
                </div>
              </TabsContent>
            </Tabs>
          </section>

          {/* Model Section */}
          <section className="flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-medium text-2xl">Model</h2>
              <Button
                variant="outline"
                size="sm"
                disabled={!isModelChangedFromDefault}
                onClick={handleResetModels}
              >
                Reset
              </Button>
            </div>

            <div className="space-y-6">
              {/* Main Model */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-base">Main Model</h3>
                  <p className="text-muted-foreground text-sm">
                    Translates the source text.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ModelCombobox
                      value={customMode.main ? "custom" : mainModel}
                      onValueChange={(val) => handleModelSelect("main", val)}
                    />
                  </div>
                  <Button disabled variant="outline" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                {customMode.main && (
                  <div className="space-y-2 pl-4 border-l-2">
                    <Label className="text-sm" htmlFor="main-model-custom">
                      Custom Model Name
                    </Label>
                    <Input
                      id="main-model-custom"
                      placeholder="e.g., gpt-4o"
                      value={customDrafts.main ?? ""}
                      onChange={(e) =>
                        handleCustomModelInput("main", e.target.value)
                      }
                    />
                  </div>
                )}
              </div>

              {/* Sub Model */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-base">Sub Model</h3>
                  <p className="text-muted-foreground text-sm">
                    Formats the translated results into JSON.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ModelCombobox
                      value={customMode.sub ? "custom" : subModel}
                      onValueChange={(val) => handleModelSelect("sub", val)}
                    />
                  </div>
                  <Button disabled variant="outline" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                {customMode.sub && (
                  <div className="space-y-2 pl-4 border-l-2">
                    <Label className="text-sm" htmlFor="sub-model-custom">
                      Custom Model Name
                    </Label>
                    <Input
                      id="sub-model-custom"
                      placeholder="e.g., gpt-4o-mini"
                      value={customDrafts.sub ?? ""}
                      onChange={(e) =>
                        handleCustomModelInput("sub", e.target.value)
                      }
                    />
                  </div>
                )}
              </div>

              {/* Feedback Model */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-base">Feedback Model</h3>
                  <p className="text-muted-foreground text-sm">
                    Provides explanations and suggestions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ModelCombobox
                      value={
                        useMainModelForFeedback
                          ? mainModel
                          : customMode.feedback
                            ? "custom"
                            : feedbackModel
                      }
                      disabled={useMainModelForFeedback}
                      onValueChange={(val) =>
                        handleModelSelect("feedback", val)
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={useMainModelForFeedback}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                {!useMainModelForFeedback && customMode.feedback && (
                  <div className="space-y-2 pl-4 border-l-2">
                    <Label className="text-sm" htmlFor="feedback-model-custom">
                      Custom Model Name
                    </Label>
                    <Input
                      id="feedback-model-custom"
                      placeholder="e.g., gpt-4o"
                      value={customDrafts.feedback ?? ""}
                      onChange={(e) =>
                        handleCustomModelInput("feedback", e.target.value)
                      }
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="use-main-model"
                    checked={useMainModelForFeedback}
                    onCheckedChange={(checked) =>
                      handleFeedbackCheckboxChange(checked === true)
                    }
                  />
                  <Label
                    htmlFor="use-main-model"
                    className="text-foreground-subtle text-sm"
                  >
                    Use Main Model
                  </Label>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer - Save Action Bar */}
      <footer className="flex justify-center items-center gap-4 py-2 border-border border-t shrink-0">
        <Button
          variant="primary"
          className="min-w-40"
          disabled={!hasChanges}
          onClick={handleSave}
        >
          Save Settings
        </Button>
        <Button variant="outline" disabled={!hasChanges} onClick={handleCancel}>
          Cancel
        </Button>
      </footer>
    </div>
  );
}
