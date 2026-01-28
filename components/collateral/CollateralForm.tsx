'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { Permission } from '@/lib/permissions'

interface CollateralFormProps {
  loanId: string
  onCollateralAdded?: () => void
}

export function CollateralForm({ loanId, onCollateralAdded }: CollateralFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    type: 'PROPERTY',
    description: '',
    estimatedValue: '',
    documentUrl: '',
  })

  const { toast } = useToast()
  const { can } = usePermissions()

  const canManage = can(Permission.COLLATERAL_MANAGE)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canManage) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to manage collateral',
        variant: 'destructive',
      })
      return
    }

    if (!formData.description || !formData.estimatedValue) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/loans/${loanId}/collateral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          description: formData.description,
          estimatedValue: parseFloat(formData.estimatedValue),
          documentUrl: formData.documentUrl || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add collateral')
      }

      toast({
        title: 'Collateral Added',
        description: data.message,
      })

      // Reset form
      setFormData({
        type: 'PROPERTY',
        description: '',
        estimatedValue: '',
        documentUrl: '',
      })

      onCollateralAdded?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add collateral',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add Collateral</CardTitle>
          <CardDescription>You do not have permission to manage collateral</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Collateral</CardTitle>
        <CardDescription>Record collateral for this loan</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Collateral Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROPERTY">Property / Real Estate</SelectItem>
                <SelectItem value="VEHICLE">Vehicle</SelectItem>
                <SelectItem value="EQUIPMENT">Equipment / Machinery</SelectItem>
                <SelectItem value="INVENTORY">Inventory / Stock</SelectItem>
                <SelectItem value="SECURITIES">Securities / Shares</SelectItem>
                <SelectItem value="JEWELRY">Jewelry / Valuables</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Detailed description of the collateral..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              Include make, model, serial number, address, or other identifying details
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedValue">Estimated Value *</Label>
            <Input
              id="estimatedValue"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.estimatedValue}
              onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentUrl">Document URL (Optional)</Label>
            <Input
              id="documentUrl"
              type="text"
              placeholder="/uploads/documents/..."
              value={formData.documentUrl}
              onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Upload collateral documents separately and paste the URL here
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Adding...' : 'Add Collateral'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
