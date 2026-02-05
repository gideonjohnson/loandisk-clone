'use client'

import { useState, useEffect } from 'react'
import { Bell, Clock, AlertTriangle, Send, RefreshCw, Calendar } from 'lucide-react'

interface UpcomingPayment {
  paymentId: string
  loanId: string
  loanNumber: string
  borrowerName: string
  borrowerPhone: string | null
  borrowerEmail: string | null
  amount: number
  dueDate: string
}

interface OverduePayment extends UpcomingPayment {
  daysOverdue: number
}

interface ReminderStats {
  remindersSentThisMonth: number
  upcomingPayments: number
  overduePayments: number
}

export default function RemindersPage() {
  const [stats, setStats] = useState<ReminderStats | null>(null)
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([])
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsRes, upcomingRes, overdueRes] = await Promise.all([
        fetch('/api/reminders/run'),
        fetch('/api/reminders/upcoming?days=7'),
        fetch('/api/reminders/overdue'),
      ])

      const statsData = await statsRes.json()
      const upcomingData = await upcomingRes.json()
      const overdueData = await overdueRes.json()

      setStats(statsData.stats)
      setUpcomingPayments(upcomingData.payments || [])
      setOverduePayments(overdueData.payments || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendUpcomingReminders = async () => {
    setSending('upcoming')
    setMessage(null)
    try {
      const res = await fetch('/api/reminders/upcoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysAhead: 3 }),
      })
      const data = await res.json()

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Sent ${data.result.sentSMS} SMS and ${data.result.sentEmail} emails for upcoming payments`,
        })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send reminders' })
    } finally {
      setSending(null)
    }
  }

  const sendOverdueNotices = async () => {
    setSending('overdue')
    setMessage(null)
    try {
      const res = await fetch('/api/reminders/overdue', {
        method: 'POST',
      })
      const data = await res.json()

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Sent ${data.result.sentSMS} SMS and ${data.result.sentEmail} emails for overdue payments`,
        })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send notices' })
    } finally {
      setSending(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Reminders</h1>
          <p className="text-gray-600 mt-2">Manage and send automated payment reminders</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
          'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Reminders This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.remindersSentThisMonth || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Upcoming Payments (7 days)</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.upcomingPayments || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Overdue Payments</p>
              <p className="text-2xl font-bold text-red-600">
                {stats?.overduePayments || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Payments Section */}
      <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Payments (Next 7 Days)
          </h2>
          <button
            onClick={sendUpcomingReminders}
            disabled={sending === 'upcoming' || upcomingPayments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            <Send className="w-4 h-4" />
            {sending === 'upcoming' ? 'Sending...' : 'Send Reminders'}
          </button>
        </div>

        <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : upcomingPayments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No upcoming payments in the next 7 days</div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrower</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {upcomingPayments.map((payment) => (
                <tr key={payment.paymentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium">
                    {payment.loanNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {payment.borrowerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>{payment.borrowerPhone || 'No phone'}</div>
                    <div>{payment.borrowerEmail || 'No email'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">
                    {formatDate(payment.dueDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>

      {/* Overdue Payments Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Overdue Payments
          </h2>
          <button
            onClick={sendOverdueNotices}
            disabled={sending === 'overdue' || overduePayments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
          >
            <Send className="w-4 h-4" />
            {sending === 'overdue' ? 'Sending...' : 'Send Notices'}
          </button>
        </div>

        <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : overduePayments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No overdue payments</div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrower</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {overduePayments.map((payment) => (
                <tr key={payment.paymentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium">
                    {payment.loanNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {payment.borrowerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>{payment.borrowerPhone || 'No phone'}</div>
                    <div>{payment.borrowerEmail || 'No email'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`px-2 py-1 text-sm font-medium rounded-full ${
                      payment.daysOverdue > 30 ? 'bg-red-100 text-red-800' :
                      payment.daysOverdue > 7 ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.daysOverdue} days
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>

      {/* Cron Job Info */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Automated Reminders</h3>
        <p className="text-sm text-gray-600 mb-2">
          To enable automated daily reminders, set up a cron job to call:
        </p>
        <code className="block p-3 bg-white rounded border text-sm">
          POST /api/reminders/run<br />
          Authorization: Bearer YOUR_CRON_API_KEY
        </code>
        <p className="text-sm text-gray-500 mt-2">
          Set CRON_API_KEY in your environment variables to secure this endpoint.
        </p>
      </div>
    </div>
  )
}
