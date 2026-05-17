"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const modelGroups = [
  {
    label: "Gemini",
    models: [
      { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
      { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
      { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
    ],
  },
  {
    label: "Claude",
    models: [
      { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
      { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
  },
  {
    label: "GPT",
    models: [
      { value: "gpt-5.4", label: "GPT-5.4" },
      { value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
      { value: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
    ],
  },
  {
    label: "Custom",
    models: [{ value: "custom", label: "Custom" }],
  },
];

export const isKnownModel = (code: string) => {
  if (!code || code === "custom") return false;
  return modelGroups.some((group) =>
    group.models.some((m) => m.value === code),
  );
};

interface ModelComboboxProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export function ModelCombobox({
  value = "",
  onValueChange,
  disabled = false,
}: ModelComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (currentValue: string) => {
    if (currentValue === value) {
      setOpen(false);
      return;
    }
    onValueChange?.(currentValue);
    setOpen(false);
  };

  const allModels = modelGroups.flatMap((group) => group.models);
  const selectedModel = allModels.find((model) => model.value === value);
  const isCustom = value && !isKnownModel(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-full"
          disabled={disabled}
        >
          {isCustom ? "Custom" : (selectedModel?.label ?? "Select model...")}
          <ChevronsUpDown className="opacity-50 ml-2 w-4 h-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px]">
        <Command>
          <CommandInput placeholder="Search model..." />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            {modelGroups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.models.map((model) => (
                  <CommandItem
                    key={model.value}
                    value={model.value}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 w-4 h-4",
                        value === model.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {model.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
