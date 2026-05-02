import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex justify-center items-center gap-1 px-2 py-0.5 border aria-invalid:border-destructive focus-visible:border-ring rounded-md aria-invalid:ring-destructive/20 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:aria-invalid:ring-destructive/40 w-fit [&>svg]:size-3 overflow-hidden font-medium text-xs whitespace-nowrap transition-[color,box-shadow] [&>svg]:pointer-events-none shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-lefot-bg-brand text-lefot-text-onbrand [a&]:hover:bg-lefot-bg-brand-hover",
        destructive:
          "border-transparent bg-lefot-bg-danger text-lefot-text-ondanger [a&]:hover:bg-lefot-bg-danger-hover focus-visible:ring-lefot-ring/20 dark:focus-visible:ring-lefot-ring/40 dark:bg-lefot-bg-danger/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
