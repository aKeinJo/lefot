"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex items-center data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80 disabled:opacity-50 shadow-xs border border-transparent focus-visible:border-ring rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-8 h-[1.15rem] transition-all disabled:cursor-not-allowed shrink-0",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block bg-lefot-bg dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground rounded-full ring-0 size-4 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 pointer-events-none"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
