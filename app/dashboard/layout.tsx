'use client'

import { useState, useEffect, Component, ReactNode } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, DollarSign, CreditCard, BarChart3, Settings,
  LogOut, Wallet, Menu, X, Building2, Briefcase, FileText, Bell,
  AlertTriangle, UserCheck, ClipboardList
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { NotificationBell } from '@/components/notifications/NotificationBell'

// Error boundary to prevent NotificationBell from crashing the layout
class NotificationErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    console.error('NotificationBell error:', error)
  }
  render() {
    if (this.state.hasError) {
      // Fallback: just show a plain bell icon
      return (
        <button className="relative p-2 text-white/70 rounded-lg" disabled>
          <Bell className="h-5 w-5" />
        </button>
      )
    }
    return this.props.children
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Redirect to change password page if mustChangePassword is true
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.mustChangePassword) {
      router.push('/auth/change-password')
    }
  }, [session, status, router])

  const navigation: Array<{
    name: string
    href: string
    icon: LucideIcon
  }> = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Borrowers', href: '/dashboard/borrowers', icon: Users },
    { name: 'Loans', href: '/dashboard/loans', icon: DollarSign },
    { name: 'Savings', href: '/dashboard/savings', icon: Wallet },
    { name: 'Investors', href: '/dashboard/investors', icon: Briefcase },
    { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
    { name: 'Reminders', href: '/dashboard/reminders', icon: Bell },
    { name: 'Branches', href: '/dashboard/branches', icon: Building2 },
    { name: 'KYC', href: '/dashboard/kyc', icon: UserCheck },
    { name: 'Fraud', href: '/dashboard/fraud', icon: AlertTriangle },
    { name: 'Audit Log', href: '/dashboard/audit-log', icon: ClipboardList },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    { name: 'Templates', href: '/dashboard/templates', icon: FileText },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  const closeSidebar = () => setSidebarOpen(false)

  // Generate breadcrumb items from pathname
  const getBreadcrumbItems = () => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length <= 1) return []

    return segments.slice(1).map((segment, index) => {
      const href = '/' + segments.slice(0, index + 2).join('/')
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
      return { label, href }
    })
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[hsl(210_10%_23%)] h-16 flex items-center justify-between px-4 shadow-pylon-nav">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-[10px] flex items-center justify-center">
            <span className="text-white font-display font-bold">M</span>
          </div>
          <span className="font-display font-semibold text-white">Meek</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationErrorBoundary>
            <NotificationBell />
          </NotificationErrorBoundary>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-white/70 hover:text-white focus:outline-none transition-colors"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[hsl(210_10%_23%)] transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 bg-[hsl(210_10%_18%)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-[10px] flex items-center justify-center">
                <span className="text-white font-display font-bold">M</span>
              </div>
              <span className="font-display font-semibold text-white">Meek</span>
            </div>
            <button
              onClick={closeSidebar}
              className="lg:hidden p-1 text-white/70 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-[10px] transition-all
                    active:scale-[0.98] touch-manipulation
                    ${isActive
                      ? 'bg-primary text-white shadow-pylon-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary/20 rounded-[10px] flex items-center justify-center">
                <span className="text-white font-display font-semibold">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0 ml-3">
                <p className="text-sm font-medium text-white truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-white/50 truncate">{session?.user?.role}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="ml-2 p-2 text-white/50 hover:text-white rounded-[10px] hover:bg-white/10 touch-manipulation transition-all"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Spacer for mobile header */}
        <div className="h-16 lg:hidden" />

        {/* Breadcrumb navigation */}
        <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb items={getBreadcrumbItems()} homeHref="/dashboard" />
        </div>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
