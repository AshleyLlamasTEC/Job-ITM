import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-800 text-white",
        secondary: "border-transparent bg-blue-50 text-blue-800",
        outline: "border-blue-200 text-blue-800",
        yellow: "border-transparent bg-yellow-400 text-blue-950",
        suave: "border-blue-100 bg-blue-50/70 text-blue-700",
        destructivo: "border-transparent bg-rose-100 text-rose-700",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
