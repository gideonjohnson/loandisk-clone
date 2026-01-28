'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { Permission } from '@/lib/permissions'
import { DollarSign, Calendar, Building2, Hash, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface Loan {
  id: string
  loanNumber: string
  principalAmount: number
  status: string
  disbursement?: {
    id: string
    amount: number
    disbursementMethod: string
    referenceNumber: string | null
    bankDetails: string | null
    disbursedAt: Date
    disbursedByUser: {
      name: string
      role: string
    }
  }
}

interface LoanDisbursementFormProps {
  loan: Loan
  onDisbursementComplete?: () => void
}

export function LoanDisbursementForm({ loan, onDisbursementComplete }: LoanDisbursementFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    disbursementMethod: 'M_PESA',
    referenceNumber: '',
    bankDetails: '',
    disbursedAt: format(new Date(), 'yyyy-MM-dd'),
    amount: loan.principalAmount.toString(),
  })

  const { toast } = useToast()
  const { can } = usePermissions()

  const canDisburse = can(Permission.LOAN_DISBURSE)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canDisburse) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to disburse loans',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/loans/${loan.id}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disburse loan')
      }

      toast({
        title: 'Loan Disbursed',
        description: data.message,
      })

      onDisbursementComplete?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to disburse loan',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // If loan is already disbursed, show disbursement details
  if (loan.disbursement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Disbursement Details</CardTitle>
          <CardDescription>Loan has been disbursed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Amount Disbursed</p>
              <p className="text-lg font-semibold">
                KSh {Number(loan.disbursement.amount).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Method</p>
              <p className="text-sm font-medium">{loan.disbursement.disbursementMethod.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disbursement Date</p>
              <p className="text-sm font-medium">
                {format(new Date(loan.disbursement.disbursedAt), 'MMM dd, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disbursed By</p>
              <p className="text-sm font-medium">{loan.disbursement.disbursedByUser.name}</p>
              <p className="text-xs text-muted-foreground">{loan.disbursement.disbursedByUser.role}</p>
            </div>
          </div>

          {loan.disbursement.referenceNumber && (
            <div>
              <p className="text-sm text-muted-foreground">Reference Number</p>
              <p className="text-sm font-mono font-medium">{loan.disbursement.referenceNumber}</p>
            </div>
          )}

          {loan.disbursement.bankDetails && (
            <div>
              <p className="text-sm text-muted-foreground">Bank Details</p>
              <p className="text-sm">{loan.disbursement.bankDetails}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // If loan is not approved, show message
  if (loan.status !== 'APPROVED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loan Disbursement</CardTitle>
          <CardDescription>Loan must be approved before disbursement</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Current status: <span className="font-medium">{loan.status}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            The loan must be approved before it can be disbursed.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Show disbursement form
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disburse Loan</CardTitle>
        <CardDescription>Record loan disbursement details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              <DollarSign className="h-4 w-4 inline mr-1" />
              Amount to Disburse
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Principal amount: KSh {Number(loan.principalAmount).toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="disbursementMethod">
              <Building2 className="h-4 w-4 inline mr-1" />
              Disbursement Method *
            </Label>
            <Select
              value={formData.disbursementMethod}
              onValueChange={(value) =>
                setFormData({ ...formData, disbursementMethod: value })
              }
            >
              <SelectTrigger id="disbursementMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M_PESA">M-Pesa</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="AIRTEL_MONEY">Airtel Money</SelectItem>
                <SelectItem value="CHECK">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="disbursedAt">
              <Calendar className="h-4 w-4 inline mr-1" />
              Disbursement Date *
            </Label>
            <Input
              id="disbursedAt"
              type="date"
              value={formData.disbursedAt}
              onChange={(e) => setFormData({ ...formData, disbursedAt: e.target.value })}
              max={format(new Date(), 'yyyy-MM-dd')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceNumber">
              <Hash className="h-4 w-4 inline mr-1" />
              Reference Number
            </Label>
            <Input
              id="referenceNumber"
              placeholder="e.g., TXN123456789"
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Transaction or transfer reference number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankDetails">
              <FileText className="h-4 w-4 inline mr-1" />
              Bank Details / Notes
            </Label>
            <Textarea
              id="bankDetails"
              placeholder="Bank name, account details, or other relevant information..."
              value={formData.bankDetails}
              onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !canDisburse}
              className="flex-1"
            >
              {isSubmitting ? 'Processing...' : 'Disburse Loan'}
            </Button>
          </div>

          {!canDisburse && (
            <p className="text-sm text-destructive text-center">
              You do not have permission to disburse loans
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
