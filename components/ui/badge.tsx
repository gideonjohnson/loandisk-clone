import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[10px] border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-[hsl(134_61%_41%)] text-white shadow hover:bg-[hsl(134_61%_35%)]",
        warning:
          "border-transparent bg-[hsl(45_100%_51%)] text-[hsl(210_10%_23%)] shadow hover:bg-[hsl(45_100%_45%)]",
        info:
          "border-transparent bg-[hsl(188_78%_41%)] text-white shadow hover:bg-[hsl(188_78%_35%)]",
        dark:
          "border-transparent bg-[hsl(210_10%_23%)] text-white shadow hover:bg-[hsl(210_10%_18%)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
