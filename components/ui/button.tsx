import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-pylon-sm hover:shadow-pylon active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        success:
          "bg-[hsl(134_61%_41%)] text-white hover:bg-[hsl(134_61%_35%)]",
        info:
          "bg-[hsl(188_78%_41%)] text-white hover:bg-[hsl(188_78%_35%)]",
        warning:
          "bg-[hsl(45_100%_51%)] text-[hsl(210_10%_23%)] hover:bg-[hsl(45_100%_45%)]",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        dark:
          "bg-[hsl(210_10%_23%)] text-white hover:bg-[hsl(210_10%_18%)]",
        light:
          "bg-white text-[hsl(210_10%_23%)] border border-gray-200 hover:bg-gray-50",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-none",
        ghost:
          "hover:bg-accent hover:text-accent-foreground shadow-none",
        link:
          "text-primary underline-offset-4 hover:underline shadow-none",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        default: "h-11 px-5 py-2",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
