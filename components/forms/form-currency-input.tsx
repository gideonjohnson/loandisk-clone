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
import { getCurrencyConfig, DEFAULT_CURRENCY } from "@/lib/currency/currencyConfig"

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
  currency = DEFAULT_CURRENCY,
}: FormCurrencyInputProps) {
  const form = useFormContext()
  const currencyConfig = getCurrencyConfig(currency)

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, "")

    // Ensure only one decimal point
    const parts = numericValue.split(".")
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("")
    }

    // Limit decimal places based on currency config
    const maxDecimals = currencyConfig.decimalPlaces
    if (parts[1] && parts[1].length > maxDecimals) {
      return `${parts[0]}.${parts[1].slice(0, maxDecimals)}`
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {currencyConfig.symbol}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder={placeholder}
                disabled={disabled}
                className="pl-10"
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
