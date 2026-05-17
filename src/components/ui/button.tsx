import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex justify-center items-center gap-2 rounded-md outline-none font-medium text-lefot-text text-sm whitespace-nowrap transition-all cursor-pointer shrink-0",
    "disabled:pointer-events-none disabled:opacity-50  [&_svg]:pointer-events-none",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  {
    variants: {
      variant: {
        default:
          "bg-lefot-bg-inverse text-lefot-text-oninverse hover:bg-lefot-bg-inverse-hover active:bg-lefot-bg-inverse-pressed",
        primary:
          "bg-lefot-bg-brand text-lefot-text-onbrand hover:bg-lefot-bg-brand-hover active:bg-lefot-bg-brand-pressed",
        outline:
          "border bg-inherit hover:bg-lefot-bg-hover active:bg-lefot-bg-pressed shadow-xs",
        ghost: "bg-inherit hover:bg-lefot-bg-hover active:bg-lefot-bg-pressed",
        link: "text-lefot-text underline-offset-4 hover:underline",
        destructive:
          "bg-lefot-bg-danger hover:bg-lefot-bg-danger-hover text-lefot-text-danger focus-visible:ring-lefot-border-danger/20",
      },
      size: {
        default: "h-8 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-9 rounded-md px-6 has-[>svg]:px-4",
        xl: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-8",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
