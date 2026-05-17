"use client";

import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Root
type RootProps = React.ComponentProps<typeof Tooltip>;

function TooltipButtonRoot({ children, ...tooltipProps }: RootProps) {
  return <Tooltip {...tooltipProps}>{children}</Tooltip>;
}

// Trigger
interface TriggerProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function TooltipButtonTrigger({ children, ...buttonProps }: TriggerProps) {
  return (
    <TooltipTrigger asChild>
      <Button {...buttonProps}>{children}</Button>
    </TooltipTrigger>
  );
}

// Content
type ContentProps = React.ComponentProps<typeof TooltipContent>;

function TooltipButtonContent({ children, ...props }: ContentProps) {
  return <TooltipContent {...props}>{children}</TooltipContent>;
}

// Compound
const TooltipButton = Object.assign(TooltipButtonRoot, {
  Trigger: TooltipButtonTrigger,
  Content: TooltipButtonContent,
});

export { TooltipButton };
