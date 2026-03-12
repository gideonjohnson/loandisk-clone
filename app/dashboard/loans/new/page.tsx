'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { ArrowLeft, Loader2, Calculator } from 'lucide-react'

import { createLoanSchema, type CreateLoanInput } from '@/lib/validations/loan'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/forms/form-field'
import { FormSelect } from '@/components/forms/form-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormCurrencyInput } from '@/components/forms/form-currency-input'
import { FormDatePicker } from '@/components/forms/form-date-picker'
import { FormTextarea } from '@/components/forms/form-textarea'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

interface Borrower {
  id: string
  firstName: string
  lastName: string
}

type TermUnit = 'days' | 'weeks' | 'months' | 'years'

function toMonths(value: number, unit: TermUnit): number {
  switch (unit) {
    case 'days':  return Math.max(1, Math.ceil(value / 30))
    case 'weeks': return Math.max(1, Math.ceil(value / 4))
    case 'years': return value * 12
    default:      return value
  }
}

export default function NewLoanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [loadingBorrowers, setLoadingBorrowers] = useState(true)
  const [termValue, setTermValue] = useState('12')
  const [termUnit, setTermUnit] = useState<TermUnit>('months')

  const form = useForm<CreateLoanInput>({
    resolver: zodResolver(createLoanSchema),
    defaultValues: {
      borrowerId: '',
      principalAmount: 0,
      interestRate: 0,
      termMonths: 12,
      startDate: new Date().toISOString().split('T')[0],
      purpose: '',
      notes: '',
    },
  })

  useEffect(() => {
    fetch('/api/borrowers')
      .then(res => res.json())
      .then(data => {
        setBorrowers(data)
        setLoadingBorrowers(false)
      })
      .catch(err => {
        console.error(err)
        toast({
          title: 'Error',
          description: 'Failed to load borrowers',
          variant: 'destructive',
        })
        setLoadingBorrowers(false)
      })
  }, [toast])

  // Watch form values for loan calculation
  const watchPrincipal = form.watch('principalAmount')
  const watchRate = form.watch('interestRate')
  const watchTerm = form.watch('termMonths')

  const loanCalculation = useMemo(() => {
    const principal = Number(watchPrincipal)
    const rate = Number(watchRate)
    const term = Number(watchTerm || termValue)
    if (!principal || principal <= 0 || !term || term <= 0) return null

    const annualRate = rate / 100

    switch (termUnit) {
      case 'days': {
        const interest = principal * annualRate * (term / 365)
        return { periodicPayment: principal + interest, totalRepayment: principal + interest, totalInterest: interest, periodLabel: 'Total due' }
      }
      case 'weeks': {
        const weeklyRate = annualRate / 52
        const payment = weeklyRate === 0 ? principal / term : principal * (weeklyRate * Math.pow(1 + weeklyRate, term)) / (Math.pow(1 + weeklyRate, term) - 1)
        return { periodicPayment: payment, totalRepayment: payment * term, totalInterest: payment * term - principal, periodLabel: 'Weekly payment' }
      }
      case 'years': {
        const yearlyRate = annualRate
        const payment = yearlyRate === 0 ? principal / term : principal * (yearlyRate * Math.pow(1 + yearlyRate, term)) / (Math.pow(1 + yearlyRate, term) - 1)
        return { periodicPayment: payment, totalRepayment: payment * term, totalInterest: payment * term - principal, periodLabel: 'Annual payment' }
      }
      default: {
        const monthlyRate = annualRate / 12
        const payment = monthlyRate === 0 ? principal / term : principal * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1)
        return { periodicPayment: payment, totalRepayment: payment * term, totalInterest: payment * term - principal, periodLabel: 'Monthly payment' }
      }
    }
  }, [watchPrincipal, watchRate, watchTerm, termUnit, termValue])

  const onSubmit = async (data: CreateLoanInput) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, termUnit }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create loan')
      }

      toast({
        title: 'Success',
        description: 'Loan created successfully',
      })

      router.push('/dashboard/loans')
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create loan',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  const borrowerOptions = borrowers.map(borrower => ({
    label: `${borrower.firstName} ${borrower.lastName}`,
    value: borrower.id,
  }))

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/loans"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Loans
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Loan</h1>
        <p className="text-gray-600 mt-2">Process a new loan application</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Borrower Selection */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Borrower Information</h3>
                    <FormSelect
                      name="borrowerId"
                      label="Select Borrower"
                      placeholder={loadingBorrowers ? "Loading borrowers..." : "Choose a borrower"}
                      options={borrowerOptions}
                      disabled={loadingBorrowers || isSubmitting}
                    />
                  </div>

                  {/* Loan Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormCurrencyInput
                        name="principalAmount"
                        label="Principal Amount"
                        placeholder="10000.00"
                      />

                      <FormField
                        name="interestRate"
                        label="Interest Rate (%)"
                        type="number"
                        placeholder="12.5"
                        description="Annual interest rate"
                      />

                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Loan Term</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={termValue}
                            onChange={(e) => {
                              setTermValue(e.target.value)
                              const months = toMonths(Number(e.target.value), termUnit)
                              form.setValue('termMonths', months, { shouldValidate: true })
                            }}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <Select
                            value={termUnit}
                            onValueChange={(unit: TermUnit) => {
                              setTermUnit(unit)
                              const months = toMonths(Number(termValue), unit)
                              form.setValue('termMonths', months, { shouldValidate: true })
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                              <SelectItem value="months">Months</SelectItem>
                              <SelectItem value="years">Years</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {termUnit !== 'months' && Number(termValue) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            = {toMonths(Number(termValue), termUnit)} month(s) for scheduling
                          </p>
                        )}
                      </div>

                      <FormDatePicker
                        name="startDate"
                        label="Start Date"
                        minDate={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                    <div className="space-y-6">
                      <FormField
                        name="purpose"
                        label="Loan Purpose"
                        placeholder="e.g., Business expansion, Working capital"
                      />

                      <FormTextarea
                        name="notes"
                        label="Notes"
                        placeholder="Additional notes or comments"
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || loadingBorrowers}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isSubmitting ? 'Creating...' : 'Create Loan'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Loan Calculation Preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Loan Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loanCalculation ? (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">{loanCalculation.periodLabel}</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(loanCalculation.periodicPayment)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-muted-foreground">Total Repayment</span>
                      <span className="font-semibold">
                        {formatCurrency(loanCalculation.totalRepayment)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-muted-foreground">Total Interest</span>
                      <span className="font-semibold text-orange-600">
                        {formatCurrency(loanCalculation.totalInterest)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-muted-foreground">Principal</span>
                      <span className="font-semibold">
                        {formatCurrency(watchPrincipal)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Term</span>
                      <span className="font-semibold">{termValue} {termUnit}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Fill in loan details to see the calculation</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
