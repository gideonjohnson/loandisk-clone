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
import { DollarSign, Calendar, Building2, Hash, FileText, Smartphone, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface Loan {
  id: string
  loanNumber: string
  principalAmount: number
  status: string
  borrower?: {
    firstName: string
    lastName: string
    phone?: string | null
  }
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

const METHOD_LABELS: Record<string, string> = {
  M_PESA: 'M-Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  BANK_TRANSFER: 'Bank Transfer',
  CASH: 'Cash',
  CHECK: 'Cheque',
}

export function LoanDisbursementForm({ loan, onDisbursementComplete }: LoanDisbursementFormProps) {
  const [step, setStep] = useState<'form' | 'confirm' | 'processing'>('form')
  const [formData, setFormData] = useState({
    disbursementMethod: 'M_PESA',
    phoneNumber: loan.borrower?.phone || '',
    referenceNumber: '',
    bankName: '',
    accountNumber: '',
    bankDetails: '',
    disbursedAt: format(new Date(), 'yyyy-MM-dd'),
    amount: loan.principalAmount.toString(),
  })

  const { toast } = useToast()
  const { can } = usePermissions()
  const canDisburse = can(Permission.LOAN_DISBURSE)

  const isMobileMoney = formData.disbursementMethod === 'M_PESA' || formData.disbursementMethod === 'AIRTEL_MONEY'
  const isBankTransfer = formData.disbursementMethod === 'BANK_TRANSFER'

  const handleSubmit = async () => {
    setStep('processing')
    try {
      const bankDetails = isBankTransfer
        ? [formData.bankName, formData.accountNumber, formData.bankDetails].filter(Boolean).join(' | ')
        : formData.bankDetails

      const response = await fetch(`/api/loans/${loan.id}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disbursementMethod: formData.disbursementMethod,
          referenceNumber: formData.referenceNumber || undefined,
          bankDetails: bankDetails || undefined,
          disbursedAt: formData.disbursedAt,
          amount: parseFloat(formData.amount),
          phoneNumber: isMobileMoney ? formData.phoneNumber : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disburse loan')
      }

      toast({ title: 'Disbursement Complete', description: data.message })
      onDisbursementComplete?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to disburse loan',
        variant: 'destructive',
      })
      setStep('form')
    }
  }

  // Already disbursed — show summary
  if (loan.disbursement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Disbursement Details
          </CardTitle>
          <CardDescription>Loan has been disbursed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Amount Disbursed</p>
              <p className="text-lg font-semibold">KSh {Number(loan.disbursement.amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Method</p>
              <p className="text-sm font-medium">{METHOD_LABELS[loan.disbursement.disbursementMethod] || loan.disbursement.disbursementMethod}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="text-sm font-medium">{format(new Date(loan.disbursement.disbursedAt), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disbursed By</p>
              <p className="text-sm font-medium">{loan.disbursement.disbursedByUser.name}</p>
              <p className="text-xs text-muted-foreground">{loan.disbursement.disbursedByUser.role}</p>
            </div>
          </div>
          {loan.disbursement.referenceNumber && (
            <div>
              <p className="text-sm text-muted-foreground">Reference</p>
              <p className="text-sm font-mono font-medium">{loan.disbursement.referenceNumber}</p>
            </div>
          )}
          {loan.disbursement.bankDetails && (
            <div>
              <p className="text-sm text-muted-foreground">Details</p>
              <p className="text-sm">{loan.disbursement.bankDetails}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

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
        </CardContent>
      </Card>
    )
  }

  // Processing state
  if (step === 'processing') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Processing disbursement...</p>
          {isMobileMoney && (
            <p className="text-xs text-muted-foreground">Sending KSh {Number(formData.amount).toLocaleString()} to {formData.phoneNumber}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Confirmation step
  if (step === 'confirm') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm Disbursement
          </CardTitle>
          <CardDescription>Please review before proceeding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3 bg-muted/40">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Borrower</span>
              <span className="font-medium">{loan.borrower ? `${loan.borrower.firstName} ${loan.borrower.lastName}` : '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Loan</span>
              <span className="font-mono font-medium">{loan.loanNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-base">KSh {Number(formData.amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Method</span>
              <span className="font-medium">{METHOD_LABELS[formData.disbursementMethod]}</span>
            </div>
            {isMobileMoney && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{formData.phoneNumber}</span>
              </div>
            )}
            {isBankTransfer && formData.bankName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bank</span>
                <span className="font-medium">{formData.bankName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{format(new Date(formData.disbursedAt), 'MMM dd, yyyy')}</span>
            </div>
          </div>

          {formData.disbursementMethod === 'M_PESA' && (
            <p className="text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded">
              Funds will be sent automatically to the borrower's M-Pesa via B2C transfer.
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
              Back
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Confirm & Disburse
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Main form
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disburse Loan</CardTitle>
        <CardDescription>Record loan disbursement — {loan.loanNumber}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => { e.preventDefault(); setStep('confirm') }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="amount">
              <DollarSign className="h-4 w-4 inline mr-1" />
              Amount to Disburse
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Principal: KSh {Number(loan.principalAmount).toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="disbursementMethod">
              <Building2 className="h-4 w-4 inline mr-1" />
              Disbursement Method *
            </Label>
            <Select
              value={formData.disbursementMethod}
              onValueChange={(value) => setFormData({ ...formData, disbursementMethod: value })}
            >
              <SelectTrigger id="disbursementMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M_PESA">M-Pesa (automatic B2C)</SelectItem>
                <SelectItem value="AIRTEL_MONEY">Airtel Money</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHECK">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile money — phone number */}
          {isMobileMoney && (
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                <Smartphone className="h-4 w-4 inline mr-1" />
                {formData.disbursementMethod === 'M_PESA' ? 'M-Pesa' : 'Airtel Money'} Number *
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="07XXXXXXXX"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
              />
              {formData.disbursementMethod === 'M_PESA' && (
                <p className="text-xs text-blue-600">
                  Funds will be pushed automatically to this number via M-Pesa B2C.
                </p>
              )}
            </div>
          )}

          {/* Bank transfer fields */}
          {isBankTransfer && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  placeholder="e.g. Equity Bank"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">
                  <Hash className="h-4 w-4 inline mr-1" />
                  Account Number
                </Label>
                <Input
                  id="accountNumber"
                  placeholder="Account number"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Cheque — reference number */}
          {formData.disbursementMethod === 'CHECK' && (
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">
                <Hash className="h-4 w-4 inline mr-1" />
                Cheque Number
              </Label>
              <Input
                id="referenceNumber"
                placeholder="e.g. 001234"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </div>
          )}

          {/* Manual reference for non-M-Pesa mobile */}
          {formData.disbursementMethod === 'AIRTEL_MONEY' && (
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">
                <Hash className="h-4 w-4 inline mr-1" />
                Transaction Reference
              </Label>
              <Input
                id="referenceNumber"
                placeholder="Airtel transaction ID"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </div>
          )}

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

          {/* Optional notes for all methods */}
          <div className="space-y-2">
            <Label htmlFor="bankDetails">
              <FileText className="h-4 w-4 inline mr-1" />
              Notes (optional)
            </Label>
            <Textarea
              id="bankDetails"
              placeholder="Any additional notes..."
              value={formData.bankDetails}
              onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={!canDisburse}
              className="flex-1"
            >
              Review & Confirm
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
