import * as React from "react"

import { cn } from "@/lib/utils"

export type InputGroupProps = React.HTMLAttributes<HTMLDivElement>

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-stretch", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
InputGroup.displayName = "InputGroup"

export interface InputGroupAddonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  position?: "left" | "right"
}

const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, position = "left", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center px-4 bg-muted border border-input text-muted-foreground text-lg font-medium",
          position === "left"
            ? "rounded-l-[10px] border-r-0"
            : "rounded-r-[10px] border-l-0",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
InputGroupAddon.displayName = "InputGroupAddon"

export interface InputGroupInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasLeftAddon?: boolean
  hasRightAddon?: boolean
}

const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className, hasLeftAddon, hasRightAddon, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex-1 h-12 w-full border border-input bg-transparent px-4 py-2 text-lg shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          hasLeftAddon && !hasRightAddon && "rounded-r-[10px] rounded-l-none",
          hasRightAddon && !hasLeftAddon && "rounded-l-[10px] rounded-r-none",
          hasLeftAddon && hasRightAddon && "rounded-none",
          !hasLeftAddon && !hasRightAddon && "rounded-[10px]",
          className
        )}
        {...props}
      />
    )
  }
)
InputGroupInput.displayName = "InputGroupInput"

export type InputGroupTextProps = React.HTMLAttributes<HTMLSpanElement>

const InputGroupText = React.forwardRef<HTMLSpanElement, InputGroupTextProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
      />
    )
  }
)
InputGroupText.displayName = "InputGroupText"

export { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText }
