'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { Permission } from '@/lib/permissions'
import { CheckCircle, XCircle, Clock, User } from 'lucide-react'
import { format } from 'date-fns'

interface LoanApproval {
  id: string
  approvalLevel: number
  status: string
  comments: string | null
  approvedAt: Date | null
  approver: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface Loan {
  id: string
  loanNumber: string
  status: string
  approvalLevel: number
  requiredApprovals: number
  approvalDate: Date | null
  rejectionReason: string | null
  approvals?: LoanApproval[]
}

interface LoanApprovalCardProps {
  loan: Loan
  onApprovalChange?: () => void
}

export function LoanApprovalCard({ loan, onApprovalChange }: LoanApprovalCardProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showApproveForm, setShowApproveForm] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [comments, setComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const { toast } = useToast()
  const { can } = usePermissions()

  const canApprove = can(Permission.LOAN_APPROVE)
  const canReject = can(Permission.LOAN_REJECT)

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const response = await fetch(`/api/loans/${loan.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve loan')
      }

      toast({
        title: 'Loan Approved',
        description: data.message,
      })

      setShowApproveForm(false)
      setComments('')
      onApprovalChange?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve loan',
        variant: 'destructive',
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      })
      return
    }

    setIsRejecting(true)
    try {
      const response = await fetch(`/api/loans/${loan.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason, comments }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject loan')
      }

      toast({
        title: 'Loan Rejected',
        description: data.message,
      })

      setShowRejectForm(false)
      setRejectionReason('')
      setComments('')
      onApprovalChange?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject loan',
        variant: 'destructive',
      })
    } finally {
      setIsRejecting(false)
    }
  }

  const getStatusBadge = () => {
    switch (loan.status) {
      case 'PENDING':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>
      case 'APPROVED':
        return <Badge className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Approved</Badge>
      case 'REJECTED':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>
      case 'ACTIVE':
        return <Badge className="gap-1 bg-blue-600">Active</Badge>
      default:
        return <Badge variant="outline">{loan.status}</Badge>
    }
  }

  const approvalProgress = loan.approvals?.filter(a => a.status === 'APPROVED').length || 0
  const requiredApprovals = loan.requiredApprovals || 1

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Loan Approval Status</CardTitle>
            <CardDescription>Approval workflow for loan #{loan.loanNumber}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Approval Progress */}
        {loan.status === 'PENDING' && (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Approval Progress</span>
              <span className="font-medium">
                {approvalProgress} / {requiredApprovals} approvals
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(approvalProgress / requiredApprovals) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Approval History */}
        {loan.approvals && loan.approvals.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Approval History</h4>
            <div className="space-y-2">
              {loan.approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{approval.approver.name}</p>
                      <Badge
                        variant={approval.status === 'APPROVED' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {approval.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {approval.approver.role} • Level {approval.approvalLevel}
                      {approval.approvedAt &&
                        ` • ${format(new Date(approval.approvedAt), 'MMM dd, yyyy HH:mm')}`
                      }
                    </p>
                    {approval.comments && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        &quot;{approval.comments}&quot;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejection Reason */}
        {loan.status === 'REJECTED' && loan.rejectionReason && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
              Rejection Reason
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">{loan.rejectionReason}</p>
          </div>
        )}

        {/* Action Buttons */}
        {loan.status === 'PENDING' && (canApprove || canReject) && (
          <div className="flex gap-2 pt-2">
            {canApprove && !showApproveForm && !showRejectForm && (
              <Button
                onClick={() => setShowApproveForm(true)}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}
            {canReject && !showApproveForm && !showRejectForm && (
              <Button
                onClick={() => setShowRejectForm(true)}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            )}
          </div>
        )}

        {/* Approve Form */}
        {showApproveForm && (
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="approve-comments">Comments (Optional)</Label>
              <Textarea
                id="approve-comments"
                placeholder="Add any comments about this approval..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex-1"
              >
                {isApproving ? 'Approving...' : 'Confirm Approval'}
              </Button>
              <Button
                onClick={() => {
                  setShowApproveForm(false)
                  setComments('')
                }}
                variant="outline"
                disabled={isApproving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Reject Form */}
        {showRejectForm && (
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this loan is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reject-comments">Additional Comments (Optional)</Label>
              <Textarea
                id="reject-comments"
                placeholder="Add any additional comments..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={isRejecting || !rejectionReason.trim()}
                variant="destructive"
                className="flex-1"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
              <Button
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectionReason('')
                  setComments('')
                }}
                variant="outline"
                disabled={isRejecting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
