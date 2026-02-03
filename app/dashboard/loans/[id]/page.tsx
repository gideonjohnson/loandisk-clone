'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoanApprovalCard } from '@/components/loans/LoanApprovalCard'
import { LoanDisbursementForm } from '@/components/loans/LoanDisbursementForm'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  User,
  Pen,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  Eye,
  AlertCircle,
  AlertTriangle,
  Loader2,
  LucideIcon,
} from 'lucide-react'
import { format } from 'date-fns'

interface LoanBorrower {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  monthlyIncome?: number | null
  creditScore?: number | null
}

interface LoanOfficer {
  name: string
  email: string
}

interface LoanDisbursement {
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

interface LoanApproval {
  id: string
  level: number
  status: string
  comments?: string | null
  createdAt: string
  approvedBy: {
    name: string
    role: string
  }
}

interface LoanData {
  id: string
  loanNumber: string
  status: string
  principalAmount: number
  interestRate: number
  termMonths: number
  purpose?: string | null
  createdAt: string
  startDate: string
  endDate: string
  disbursementDate?: string | null
  borrowerId: string
  borrower?: LoanBorrower
  approvalLevel: number
  requiredApprovals: number
  approvalDate?: Date | null
  rejectionReason?: string | null
  approvals?: LoanApproval[]
  outstandingBalance?: number
  totalRepaid?: number
  schedule?: Array<{ id: string; dueDate: string; amount: number; status: string }>
  disbursement?: LoanDisbursement
  loanOfficer?: LoanOfficer
  notes?: string | null
}

interface SignatureRequest {
  id: string
  token: string
  documentType: string
  status: string
  signatureUrl: string
  createdAt: string
  expiresAt: string
  viewedAt: string | null
  signedAt: string | null
  borrowerName: string
  borrowerEmail: string | null
}

interface FraudCheckSummary {
  id: string
  riskScore: number
  isSuspicious: boolean
  flags: string[]
  checkedAt: string
}

interface LoanDetailPageProps {
  params: {
    id: string
  }
}

export default function LoanDetailPage({ params }: LoanDetailPageProps) {
  const [loan, setLoan] = useState<LoanData | null>(null)
  const [signatures, setSignatures] = useState<SignatureRequest[]>([])
  const [fraudCheck, setFraudCheck] = useState<FraudCheckSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [requestingSignature, setRequestingSignature] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const fetchLoan = async () => {
    try {
      const response = await fetch(`/api/loans/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch loan')
      }
      const data = await response.json()
      setLoan(data.loan || data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load loan details',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSignatures = async () => {
    try {
      const response = await fetch(`/api/loans/${params.id}/signatures`)
      if (response.ok) {
        const data = await response.json()
        setSignatures(data.signatures || [])
      }
    } catch (error) {
      console.error('Failed to fetch signatures:', error)
    }
  }

  const fetchFraudCheck = async () => {
    try {
      const response = await fetch(`/api/fraud?loanId=${params.id}`)
      if (response.ok) {
        const data = await response.json()
        const checks = Array.isArray(data) ? data : []
        if (checks.length > 0) {
          const check = checks[0]
          setFraudCheck({
            id: check.id,
            riskScore: check.riskScore,
            isSuspicious: check.isSuspicious,
            flags: typeof check.flags === 'string' ? JSON.parse(check.flags) : check.flags || [],
            checkedAt: check.checkedAt,
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch fraud check:', error)
    }
  }

  useEffect(() => {
    fetchLoan()
    fetchSignatures()
    fetchFraudCheck()
  }, [params.id])

  const requestSignature = async () => {
    setRequestingSignature(true)
    try {
      const response = await fetch('/api/signature/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: params.id }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Signature Requested',
          description: 'A signing link has been generated. Share it with the borrower.',
        })
        fetchSignatures()
      } else {
        throw new Error(data.error || 'Failed to request signature')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to request signature',
        variant: 'destructive',
      })
    } finally {
      setRequestingSignature(false)
    }
  }

  const copySigningLink = (signatureUrl: string) => {
    const fullUrl = `${window.location.origin}${signatureUrl}`
    navigator.clipboard.writeText(fullUrl)
    toast({
      title: 'Link Copied',
      description: 'Signing link copied to clipboard',
    })
  }

  const getSignatureStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: LucideIcon; label: string }> = {
      PENDING: { variant: 'outline', icon: Clock, label: 'Pending' },
      SENT: { variant: 'secondary', icon: Clock, label: 'Sent' },
      VIEWED: { variant: 'secondary', icon: Eye, label: 'Viewed' },
      SIGNED: { variant: 'default', icon: CheckCircle, label: 'Signed' },
      DECLINED: { variant: 'destructive', icon: AlertCircle, label: 'Declined' },
      EXPIRED: { variant: 'destructive', icon: AlertCircle, label: 'Expired' },
    }

    const { variant, icon: Icon, label } = config[status] || config.PENDING

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Loan Not Found</h3>
          <p className="text-muted-foreground">The requested loan could not be found.</p>
          <Button onClick={() => router.push('/dashboard/loans')} className="mt-4">
            Back to Loans
          </Button>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'outline',
      APPROVED: 'default',
      ACTIVE: 'default',
      REJECTED: 'destructive',
      PAID: 'secondary',
      DEFAULTED: 'destructive',
    }

    const colors: Record<string, string> = {
      APPROVED: 'bg-green-600',
      ACTIVE: 'bg-blue-600',
      PAID: 'bg-gray-600',
    }

    return (
      <Badge variant={variants[status] || 'outline'} className={colors[status]}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/loans')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Loan #{loan.loanNumber}</h1>
            {getStatusBadge(loan.status)}
          </div>
          <p className="text-muted-foreground">
            Created {format(new Date(loan.createdAt), 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Generate Statement
          </Button>
        </div>
      </div>

      {/* Fraud Alert */}
      {fraudCheck && fraudCheck.isSuspicious && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-red-800">Fraud Alert</h3>
                  <Badge variant="destructive">Risk Score: {fraudCheck.riskScore}</Badge>
                </div>
                <p className="text-sm text-red-700 mb-2">
                  This loan has been flagged by the fraud detection system.
                </p>
                {fraudCheck.flags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {fraudCheck.flags.map((f) => (
                      <Badge key={f} variant="outline" className="text-red-700 border-red-300 text-xs">{f}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/fraud/${fraudCheck.id}`)}
                className="flex-shrink-0"
              >
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Loan Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Loan Summary</CardTitle>
            <CardDescription>Key loan details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Principal Amount</p>
                <p className="text-2xl font-bold">
                  KSh {Number(loan.principalAmount).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Interest Rate</p>
                <p className="text-2xl font-bold">
                  {Number(loan.interestRate)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Term</p>
                <p className="text-lg font-semibold">{loan.termMonths} months</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Purpose</p>
                <p className="text-sm font-medium">{loan.purpose || 'Not specified'}</p>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Start:</span>
                <span className="font-medium">
                  {format(new Date(loan.startDate), 'MMM dd, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">End:</span>
                <span className="font-medium">
                  {format(new Date(loan.endDate), 'MMM dd, yyyy')}
                </span>
              </div>
              {loan.disbursementDate && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Disbursed:</span>
                  <span className="font-medium">
                    {format(new Date(loan.disbursementDate), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Borrower Information */}
        <Card>
          <CardHeader>
            <CardTitle>Borrower Information</CardTitle>
            <CardDescription>Details about the borrower</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loan.borrower && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-lg font-semibold">
                    {loan.borrower.firstName} {loan.borrower.lastName}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {loan.borrower.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{loan.borrower.email}</p>
                    </div>
                  )}
                  {loan.borrower.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{loan.borrower.phone}</p>
                    </div>
                  )}
                  {loan.borrower.monthlyIncome && (
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Income</p>
                      <p className="text-sm font-medium">
                        KSh {Number(loan.borrower.monthlyIncome).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {loan.borrower.creditScore && (
                    <div>
                      <p className="text-sm text-muted-foreground">Credit Score</p>
                      <p className="text-sm font-medium">{loan.borrower.creditScore}</p>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/borrowers/${loan.borrowerId}`)}
                  className="w-full mt-2"
                >
                  <User className="h-4 w-4 mr-2" />
                  View Full Profile
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval Workflow */}
      <div className="grid gap-6 md:grid-cols-2">
        <LoanApprovalCard
          loan={{
            id: loan.id,
            loanNumber: loan.loanNumber,
            status: loan.status,
            approvalLevel: loan.approvalLevel,
            requiredApprovals: loan.requiredApprovals,
            approvalDate: loan.approvalDate ?? null,
            rejectionReason: loan.rejectionReason ?? null,
          }}
          onApprovalChange={fetchLoan}
        />
        <LoanDisbursementForm
          loan={{
            id: loan.id,
            loanNumber: loan.loanNumber,
            principalAmount: loan.principalAmount,
            status: loan.status,
            disbursement: loan.disbursement,
          }}
          onDisbursementComplete={fetchLoan}
        />
      </div>

      {/* E-Signature Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Pen className="h-5 w-5" />
                E-Signatures
              </CardTitle>
              <CardDescription>Request and track document signatures</CardDescription>
            </div>
            <Button
              onClick={requestSignature}
              disabled={requestingSignature || loan.status === 'REJECTED'}
            >
              {requestingSignature ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Pen className="h-4 w-4 mr-2" />
                  Request Signature
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {signatures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Pen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No signature requests yet</p>
              <p className="text-sm">Click &quot;Request Signature&quot; to generate a signing link</p>
            </div>
          ) : (
            <div className="space-y-4">
              {signatures.map((sig) => (
                <div
                  key={sig.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {sig.documentType.replace('_', ' ')}
                      </span>
                      {getSignatureStatusBadge(sig.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {sig.borrowerName} {sig.borrowerEmail && `(${sig.borrowerEmail})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {format(new Date(sig.createdAt), 'MMM dd, yyyy HH:mm')}
                      {sig.signedAt && (
                        <> &bull; Signed: {format(new Date(sig.signedAt), 'MMM dd, yyyy HH:mm')}</>
                      )}
                      {sig.viewedAt && !sig.signedAt && (
                        <> &bull; Viewed: {format(new Date(sig.viewedAt), 'MMM dd, yyyy HH:mm')}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {sig.status !== 'SIGNED' && sig.status !== 'EXPIRED' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copySigningLink(sig.signatureUrl)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(sig.signatureUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Officer */}
      {loan.loanOfficer && (
        <Card>
          <CardHeader>
            <CardTitle>Loan Officer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{loan.loanOfficer.name}</p>
                <p className="text-sm text-muted-foreground">{loan.loanOfficer.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {loan.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{loan.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
