"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

interface FormCurrencyInputProps {
  name: string
  label?: string
  placeholder?: string
  description?: string
  disabled?: boolean
  className?: string
  currency?: string
}

export function FormCurrencyInput({
  name,
  label,
  placeholder = "0.00",
  description,
  disabled = false,
  className,
  currency = "USD",
}: FormCurrencyInputProps) {
  const form = useFormContext()

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, "")

    // Ensure only one decimal point
    const parts = numericValue.split(".")
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("")
    }

    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return `${parts[0]}.${parts[1].slice(0, 2)}`
    }

    return numericValue
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder={placeholder}
                disabled={disabled}
                className="pl-7"
                {...field}
                value={field.value || ""}
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value)
                  field.onChange(formatted ? parseFloat(formatted) : "")
                }}
              />
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
