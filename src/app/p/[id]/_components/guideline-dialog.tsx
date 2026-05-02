"use client";

import * as React from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface GuidelineDialogProps {
  hasGuideline?: boolean;
  value: string;
  onSave?: (guideline: string) => void;
}

export function GuidelineDialog({
  hasGuideline = false,
  value,
  onSave,
}: GuidelineDialogProps) {
  const [open, setOpen] = React.useState(false);
  // originalGuideline: 마지막으로 저장된 상태 — 부모 prop이 바뀌면 동기화
  const [originalGuideline, setOriginalGuideline] = React.useState(value);
  React.useEffect(() => {
    setOriginalGuideline(value);
  }, [value]);
  // modifiedGuideline: 사용자가 현재 폼에서 수정 중인 상태
  const [modifiedGuideline, setModifiedGuideline] = React.useState("");

  // 다이얼로그가 열릴 때, 입력창을 기존 저장된 값으로 초기화
  React.useEffect(() => {
    if (open) {
      setModifiedGuideline(originalGuideline);
    }
  }, [open, originalGuideline]);

  const handleSave = () => {
    setOriginalGuideline(modifiedGuideline);
    onSave?.(modifiedGuideline);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // 닫으려고 할 때, 수정 사항이 있다면 경고
      if (originalGuideline !== modifiedGuideline) {
        if (
          !window.confirm(
            "You have unsaved changes. Are you sure you want to close?",
          )
        ) {
          return; // 취소 시 다이얼로그 유지
        }
      }
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="gap-1">
          {hasGuideline ? (
            <Check className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Guideline
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-lefot-bg sm:max-w-150">
        <DialogHeader>
          <DialogTitle>Guideline</DialogTitle>
          <DialogDescription>
            Additional system prompt for translation.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Textarea
            value={modifiedGuideline}
            onChange={(e) => setModifiedGuideline(e.target.value)}
            placeholder="e.g., Use formal language suitable for business emails. Maintain the original tone and ensure technical terms are accurately translated. The target audience is corporate executives in Japan."
            className="bg-lefot-bg-secondary min-h-50 resize-none"
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSave} variant="primary">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 목표: 추가 시스템 프롬프트를 입력하는 가이드라인 다이얼로그
// Guideline은 Project 단위로 존재
// Project 로드 시 Guideline을 조회하여 GuidelineDialog에 전달
// Guideline이 not empty면 Guideline 존재로 간주하여 버튼에 'check' 아이콘 표시 / null 또는 empty string이면 Guideline 없음으로 간주하여 'plus' 아이콘 표시
// Guideline 트리거 시 GuidelineDialog 오픈 -> 기존 저장된 Guideline(originalGuideline) Textarea에 표시 -> 사용자가 입력 중인 데이터는 modifiedGuideline로 관리
// original != modified면 수정 사항 존재로 간주. Save 버튼은 항상 활성화되어 있지만, Guideline이 존재하는 경우에만 저장하도록 허용. 또한, 이 상태에서 overlay 영역을 클릭할 경우 변경 사항이 사라질 수 있음을 경고 ("You have unsaved changes. Are you sure you want to close?") -> confirm 창에서 확인 시 다이얼로그 닫힘, 취소 시 다이얼로그 유지
// Save 시 (Save 버튼 클릭) modifiedGuideline이 저장되고, GuidelineDialog 닫힘 -> onSave(modifiedGuideline) 콜백 호출 -> Project의 Guideline 업데이트
// Close 시 (Dialog 외부 Overlay 클릭 또는 Close 버튼 클릭, ESC 키 입력) originalGuideline으로 복원되고 GuidelineDialog 닫힘 -> 변경 사항 사라짐
