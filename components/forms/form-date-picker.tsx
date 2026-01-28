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

interface FormDatePickerProps {
  name: string
  label?: string
  placeholder?: string
  description?: string
  disabled?: boolean
  className?: string
  minDate?: string
  maxDate?: string
}

export function FormDatePicker({
  name,
  label,
  placeholder,
  description,
  disabled = false,
  className,
  minDate,
  maxDate,
}: FormDatePickerProps) {
  const form = useFormContext()

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type="date"
              placeholder={placeholder}
              disabled={disabled}
              min={minDate}
              max={maxDate}
              {...field}
              value={
                field.value
                  ? typeof field.value === "string"
                    ? field.value.split("T")[0]
                    : new Date(field.value).toISOString().split("T")[0]
                  : ""
              }
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
