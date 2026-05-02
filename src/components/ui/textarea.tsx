import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "flex bg-transparent disabled:opacity-50 shadow-xs px-3 py-2 border border-input aria-invalid:border-destructive aria-invalid:ring-lefot-border-danger focus-visible:border-ring focus-visible:ring-lefot-border-selected rounded-md outline-none focus-visible:ring-[3px] w-full min-h-16 placeholder:text-muted-foreground md:text-sm text-base transition-[color,box-shadow] field-sizing-content disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
