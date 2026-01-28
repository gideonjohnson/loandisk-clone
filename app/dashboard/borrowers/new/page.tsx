'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { createBorrowerSchema, type CreateBorrowerInput } from '@/lib/validations/borrower'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/forms/form-field'
import { FormSelect } from '@/components/forms/form-select'
import { FormPhoneInput } from '@/components/forms/form-phone-input'
import { FormCurrencyInput } from '@/components/forms/form-currency-input'
import { FormDatePicker } from '@/components/forms/form-date-picker'
import { useToast } from '@/hooks/use-toast'

export default function NewBorrowerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateBorrowerInput>({
    resolver: zodResolver(createBorrowerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      dateOfBirth: '',
      idNumber: '',
      employmentStatus: '',
      monthlyIncome: undefined,
      creditScore: undefined,
    },
  })

  const onSubmit = async (data: CreateBorrowerInput) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/borrowers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create borrower')
      }

      toast({
        title: 'Success',
        description: 'Borrower created successfully',
      })

      router.push('/dashboard/borrowers')
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create borrower',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/borrowers"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Borrowers
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Add New Borrower</h1>
        <p className="text-gray-600 mt-2">Create a new borrower profile</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="firstName"
                  label="First Name"
                  placeholder="John"
                />

                <FormField
                  name="lastName"
                  label="Last Name"
                  placeholder="Doe"
                />

                <FormPhoneInput
                  name="phone"
                  label="Phone Number"
                  placeholder="+1 (555) 000-0000"
                />

                <FormField
                  name="email"
                  label="Email Address"
                  type="email"
                  placeholder="john.doe@example.com"
                />

                <FormField
                  name="idNumber"
                  label="ID Number"
                  placeholder="ID12345678"
                />

                <FormDatePicker
                  name="dateOfBirth"
                  label="Date of Birth"
                  maxDate={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FormField
                    name="address"
                    label="Street Address"
                    placeholder="123 Main Street"
                  />
                </div>

                <FormField
                  name="city"
                  label="City"
                  placeholder="New York"
                />

                <FormField
                  name="country"
                  label="Country"
                  placeholder="United States"
                />
              </div>
            </div>

            {/* Financial Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormSelect
                  name="employmentStatus"
                  label="Employment Status"
                  placeholder="Select employment status"
                  options={[
                    { label: 'Employed', value: 'Employed' },
                    { label: 'Self-Employed', value: 'Self-Employed' },
                    { label: 'Unemployed', value: 'Unemployed' },
                    { label: 'Retired', value: 'Retired' },
                  ]}
                />

                <FormCurrencyInput
                  name="monthlyIncome"
                  label="Monthly Income"
                  placeholder="5000.00"
                />

                <FormField
                  name="creditScore"
                  label="Credit Score"
                  type="number"
                  placeholder="700"
                  description="Score between 300 and 850"
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Creating...' : 'Create Borrower'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
