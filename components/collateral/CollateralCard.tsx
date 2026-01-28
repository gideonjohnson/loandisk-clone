'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { Permission } from '@/lib/permissions'
import { Trash2, ExternalLink, Package } from 'lucide-react'

interface Collateral {
  id: string
  type: string
  description: string
  estimatedValue: number
  documentUrl: string | null
}

interface CollateralCardProps {
  loanId: string
  refreshTrigger?: number
}

export function CollateralCard({ loanId, refreshTrigger }: CollateralCardProps) {
  const [collaterals, setCollaterals] = useState<Collateral[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [totalValue, setTotalValue] = useState(0)

  const { toast } = useToast()
  const { can } = usePermissions()

  const canManage = can(Permission.COLLATERAL_MANAGE)

  const fetchCollaterals = async () => {
    try {
      const response = await fetch(`/api/loans/${loanId}/collateral`)

      if (!response.ok) {
        throw new Error('Failed to fetch collateral')
      }

      const data = await response.json()
      setCollaterals(data.collaterals)
      setTotalValue(data.totalValue)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load collateral',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCollaterals()
  }, [loanId, refreshTrigger])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this collateral?')) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/collateral/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete collateral')
      }

      toast({
        title: 'Collateral Removed',
        description: 'Collateral has been removed successfully',
      })

      fetchCollaterals()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove collateral',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      PROPERTY: 'bg-blue-100 text-blue-800',
      VEHICLE: 'bg-purple-100 text-purple-800',
      EQUIPMENT: 'bg-green-100 text-green-800',
      INVENTORY: 'bg-yellow-100 text-yellow-800',
      SECURITIES: 'bg-indigo-100 text-indigo-800',
      JEWELRY: 'bg-pink-100 text-pink-800',
      OTHER: 'bg-gray-100 text-gray-800',
    }

    return (
      <Badge variant="outline" className={colors[type] || colors.OTHER}>
        {type.replace('_', ' ')}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collateral</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading collateral...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Collateral ({collaterals.length})</CardTitle>
            <CardDescription>Loan security and collateral items</CardDescription>
          </div>
          {totalValue > 0 && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">KSh {totalValue.toLocaleString()}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {collaterals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No collateral added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {collaterals.map((collateral) => (
              <div
                key={collateral.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(collateral.type)}
                      <span className="text-lg font-semibold">
                        KSh {Number(collateral.estimatedValue).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {collateral.description}
                    </p>
                    {collateral.documentUrl && (
                      <a
                        href={collateral.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Document
                      </a>
                    )}
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(collateral.id)}
                      disabled={deletingId === collateral.id}
                      title="Remove collateral"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
