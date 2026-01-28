"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

interface FormFieldProps {
  name: string
  label?: string
  placeholder?: string
  description?: string
  type?: string
  disabled?: boolean
  className?: string
}

export function FormField({
  name,
  label,
  placeholder,
  description,
  type = "text",
  disabled = false,
  className,
}: FormFieldProps) {
  const form = useFormContext()

  return (
    <ShadcnFormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              placeholder={placeholder}
              type={type}
              disabled={disabled}
              {...field}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
