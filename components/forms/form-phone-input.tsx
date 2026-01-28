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

interface FormPhoneInputProps {
  name: string
  label?: string
  placeholder?: string
  description?: string
  disabled?: boolean
  className?: string
}

export function FormPhoneInput({
  name,
  label,
  placeholder = "+1 (555) 000-0000",
  description,
  disabled = false,
  className,
}: FormPhoneInputProps) {
  const form = useFormContext()

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/\D/g, "")

    // Format as international number with + prefix
    if (numericValue.length === 0) return ""
    if (numericValue[0] !== "1" && numericValue.length > 0) {
      return `+${numericValue}`
    }
    return `+${numericValue}`
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type="tel"
              inputMode="tel"
              placeholder={placeholder}
              disabled={disabled}
              {...field}
              value={field.value || ""}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value)
                field.onChange(formatted)
              }}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
