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

export default function NewLoanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [loadingBorrowers, setLoadingBorrowers] = useState(true)

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

  // Calculate monthly payment
  const loanCalculation = useMemo(() => {
    if (!watchPrincipal || !watchRate || !watchTerm) {
      return null
    }

    const principal = Number(watchPrincipal)
    const rate = Number(watchRate) / 100 / 12
    const term = Number(watchTerm)

    if (rate === 0) {
      const monthlyPayment = principal / term
      return {
        monthlyPayment,
        totalRepayment: monthlyPayment * term,
        totalInterest: 0,
      }
    }

    const monthlyPayment = principal * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1)
    const totalRepayment = monthlyPayment * term
    const totalInterest = totalRepayment - principal

    return {
      monthlyPayment,
      totalRepayment,
      totalInterest,
    }
  }, [watchPrincipal, watchRate, watchTerm])

  const onSubmit = async (data: CreateLoanInput) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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

                      <FormField
                        name="termMonths"
                        label="Term (Months)"
                        type="number"
                        placeholder="12"
                        description="1-360 months"
                      />

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
                    <p className="text-sm text-muted-foreground mb-1">Monthly Payment</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(loanCalculation.monthlyPayment)}
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
                      <span className="text-sm text-muted-foreground">Principal Amount</span>
                      <span className="font-semibold">
                        {formatCurrency(watchPrincipal)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Loan Term</span>
                      <span className="font-semibold">
                        {watchTerm} {watchTerm === 1 ? 'month' : 'months'}
                      </span>
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
