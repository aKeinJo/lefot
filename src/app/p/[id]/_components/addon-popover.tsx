"use client";

import * as React from "react";
import { Copy, Check, MessageSquare, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Sentence } from "@/store/useProjectStore";
import { useUIStore } from "@/store/useUIStore";

interface AddonPopoverProps {
  children: React.ReactNode;
  sentence: Sentence;
}

export function AddonPopover({ children, sentence }: AddonPopoverProps) {
  const [hasCopied, setHasCopied] = React.useState(false);
  const [context, setContext] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const { openPanel, setPopoverOpenChunkId } = useUIStore();

  const handleCopy = () => {
    navigator.clipboard.writeText(sentence.target);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleOpenPanel = (mode: "explain" | "suggest" | "retranslate") => {
    setOpen(false);
    openPanel(sentence.id, mode, context);
    setContext("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        setPopoverOpenChunkId(v ? sentence.id : null);
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="z-2 flex flex-col gap-2 p-4 w-80"
        align="start"
      >
        {/* Actions row */}
        <div className="flex flex-col gap-2 pb-2 border-lefot-border border-b">
          <div className="flex items-center">
            <span className="text-lefot-text-secondary text-sm">
              Do you have any requests?
            </span>
          </div>
          {/* Context textarea */}
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Add context (optional)..."
            className="min-h-16 text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button
              className="flex flex-1 gap-2"
              onClick={() => handleOpenPanel("explain")}
            >
              Explain
            </Button>
            <Button
              className="flex flex-1 gap-2"
              onClick={() => handleOpenPanel("suggest")}
            >
              Suggest Edit
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between gap-2 w-full">
            <div className="flex flex-1">
              <Button
                variant="outline"
                size="default"
                className="flex-1 hover:bg-lefot-bg-hover"
                onClick={() => handleOpenPanel("retranslate")}
              >
                <RefreshCw className="size-4" />
                Edit Sentence
              </Button>
            </div>

            <div className="flex flex-1 justify-end">
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 shrink-0"
                onClick={handleCopy}
                disabled={hasCopied}
                title="Copy translation"
              >
                {hasCopied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
