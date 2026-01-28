'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { ArrowLeft, Loader2, Receipt, AlertCircle } from 'lucide-react'

import { createPaymentSchema, type CreatePaymentInput } from '@/lib/validations/payment'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/forms/form-field'
import { FormSelect } from '@/components/forms/form-select'
import { FormCurrencyInput } from '@/components/forms/form-currency-input'
import { FormDatePicker } from '@/components/forms/form-date-picker'
import { FormTextarea } from '@/components/forms/form-textarea'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

interface Loan {
  id: string
  loanNumber: string
  borrower: {
    firstName: string
    lastName: string
  }
  principalAmount: number
  schedules: LoanSchedule[]
}

interface LoanSchedule {
  id: string
  dueDate: string
  totalDue: number
  totalPaid: number
  isPaid: boolean
}

export default function NewPaymentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loans, setLoans] = useState<Loan[]>([])
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [loadingLoans, setLoadingLoans] = useState(true)

  const form = useForm<CreatePaymentInput>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      loanId: '',
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'M-Pesa',
      principalAmount: 0,
      interestAmount: 0,
      feesAmount: 0,
      notes: '',
      scheduleId: '',
    },
  })

  useEffect(() => {
    fetch('/api/loans')
      .then(res => res.json())
      .then(async (loansData) => {
        const activeLoans = loansData.filter((loan: Loan) => loan.schedules && loan.schedules.length > 0)

        const loansWithSchedules = await Promise.all(
          activeLoans.map(async (loan: Loan) => {
            const response = await fetch(`/api/loans/${loan.id}`)
            const loanDetails = await response.json()
            return loanDetails
          })
        )

        setLoans(loansWithSchedules)
        setLoadingLoans(false)
      })
      .catch(err => {
        console.error(err)
        toast({
          title: 'Error',
          description: 'Failed to load loans',
          variant: 'destructive',
        })
        setLoadingLoans(false)
      })
  }, [toast])

  // Watch form values for validation and calculation
  const watchLoanId = form.watch('loanId')
  const watchScheduleId = form.watch('scheduleId')
  const watchAmount = form.watch('amount')
  const watchPrincipal = form.watch('principalAmount')
  const watchInterest = form.watch('interestAmount')
  const watchFees = form.watch('feesAmount')

  // Update selected loan when loan ID changes
  useEffect(() => {
    if (watchLoanId) {
      const loan = loans.find(l => l.id === watchLoanId)
      setSelectedLoan(loan || null)
      // Reset schedule selection when loan changes
      form.setValue('scheduleId', '')
      form.setValue('amount', 0)
    } else {
      setSelectedLoan(null)
    }
  }, [watchLoanId, loans, form])

  // Auto-populate amount when schedule is selected
  useEffect(() => {
    if (watchScheduleId && selectedLoan) {
      const schedule = selectedLoan.schedules.find(s => s.id === watchScheduleId)
      if (schedule) {
        const remainingAmount = Number(schedule.totalDue) - Number(schedule.totalPaid)
        form.setValue('amount', remainingAmount)
      }
    }
  }, [watchScheduleId, selectedLoan, form])

  // Calculate remaining amount to allocate
  const remainingToAllocate = useMemo(() => {
    const total = Number(watchAmount) || 0
    const principal = Number(watchPrincipal) || 0
    const interest = Number(watchInterest) || 0
    const fees = Number(watchFees) || 0
    return total - principal - interest - fees
  }, [watchAmount, watchPrincipal, watchInterest, watchFees])

  const isValidAllocation = Math.abs(remainingToAllocate) < 0.01

  const onSubmit = async (data: CreatePaymentInput) => {
    if (!isValidAllocation) {
      toast({
        title: 'Invalid Allocation',
        description: 'Principal + Interest + Fees must equal the total payment amount',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to record payment')
      }

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      })

      router.push('/dashboard/payments')
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record payment',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  const loanOptions = loans.map(loan => ({
    label: `${loan.loanNumber} - ${loan.borrower.firstName} ${loan.borrower.lastName}`,
    value: loan.id,
  }))

  const scheduleOptions = selectedLoan
    ? selectedLoan.schedules
        .filter(s => !s.isPaid)
        .map(schedule => ({
          label: `Due: ${new Date(schedule.dueDate).toLocaleDateString()} - ${formatCurrency(Number(schedule.totalDue))} (Paid: ${formatCurrency(Number(schedule.totalPaid))})`,
          value: schedule.id,
        }))
    : []

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Payments
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Record Payment</h1>
        <p className="text-gray-600 mt-2">Record a new loan payment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Loan Selection */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Information</h3>
                    <div className="space-y-6">
                      <FormSelect
                        name="loanId"
                        label="Select Loan"
                        placeholder={loadingLoans ? "Loading loans..." : "Choose a loan"}
                        options={loanOptions}
                        disabled={loadingLoans || isSubmitting}
                      />

                      {selectedLoan && scheduleOptions.length > 0 && (
                        <FormSelect
                          name="scheduleId"
                          label="Payment Schedule (Optional)"
                          placeholder="Select a specific schedule or leave blank"
                          options={scheduleOptions}
                          disabled={isSubmitting}
                        />
                      )}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormCurrencyInput
                        name="amount"
                        label="Payment Amount"
                        placeholder="1000.00"
                      />

                      <FormDatePicker
                        name="paymentDate"
                        label="Payment Date"
                      />

                      <div className="md:col-span-2">
                        <FormSelect
                          name="paymentMethod"
                          label="Payment Method"
                          options={[
                            { label: 'M-Pesa', value: 'M-Pesa' },
                            { label: 'Airtel Money', value: 'Airtel Money' },
                            { label: 'Cash', value: 'Cash' },
                            { label: 'Bank Transfer', value: 'Bank Transfer' },
                            { label: 'Cheque', value: 'Cheque' },
                            { label: 'Card', value: 'Card' },
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Allocation */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Allocation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormCurrencyInput
                        name="principalAmount"
                        label="Principal Amount"
                        placeholder="800.00"
                      />

                      <FormCurrencyInput
                        name="interestAmount"
                        label="Interest Amount"
                        placeholder="200.00"
                      />

                      <FormCurrencyInput
                        name="feesAmount"
                        label="Fees Amount"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <FormTextarea
                      name="notes"
                      label="Notes"
                      placeholder="Additional notes or comments"
                      rows={3}
                    />
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
                    <Button type="submit" disabled={isSubmitting || !isValidAllocation || loadingLoans}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isSubmitting ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {watchAmount > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Payment</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(watchAmount)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-muted-foreground">Principal</span>
                      <span className="font-semibold">
                        {formatCurrency(watchPrincipal)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-muted-foreground">Interest</span>
                      <span className="font-semibold">
                        {formatCurrency(watchInterest)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-muted-foreground">Fees</span>
                      <span className="font-semibold">
                        {formatCurrency(watchFees || 0)}
                      </span>
                    </div>

                    <div className={`flex justify-between items-center p-3 rounded-lg ${
                      isValidAllocation ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <span className="text-sm font-medium">
                        {isValidAllocation ? 'Fully Allocated' : 'Remaining'}
                      </span>
                      <span className={`text-lg font-bold ${
                        isValidAllocation ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(Math.abs(remainingToAllocate))}
                      </span>
                    </div>
                  </div>

                  {!isValidAllocation && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        Principal + Interest + Fees must equal the total payment amount
                      </p>
                    </div>
                  )}

                  {selectedLoan && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Loan Information</p>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {selectedLoan.borrower.firstName} {selectedLoan.borrower.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedLoan.loanNumber}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Select a loan and enter payment amount</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
