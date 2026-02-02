'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, CreditCard, Wallet, FileText, User, LogOut, Menu, X, HelpCircle
} from 'lucide-react'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/portal', icon: Home },
    { name: 'My Loans', href: '/portal/loans', icon: CreditCard },
    { name: 'Payments', href: '/portal/payments', icon: Wallet },
    { name: 'Documents', href: '/portal/documents', icon: FileText },
    { name: 'Profile', href: '/portal/profile', icon: User },
    { name: 'Help', href: '/portal/help', icon: HelpCircle },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-pylon-nav sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/portal" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-[10px] flex items-center justify-center shadow-pylon-sm">
                <span className="text-white font-display font-bold text-lg">M</span>
              </div>
              <span className="font-display font-semibold text-foreground hidden sm:block">Meek Portal</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-[10px] text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-primary text-white shadow-pylon-sm'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* Logout + Mobile Menu */}
            <div className="flex items-center gap-2">
              <Link
                href="/portal/logout"
                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-[10px] hover:bg-secondary transition-all"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="md:hidden border-t bg-white shadow-pylon">
            <nav className="px-4 py-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-[10px] text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                )
              })}
              <Link
                href="/portal/logout"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-[10px] text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Meek Microfinance. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
