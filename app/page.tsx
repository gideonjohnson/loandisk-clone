import Link from 'next/link'
import { DollarSign, BarChart3, Users, CreditCard, Mail, Shield } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <h1 className="text-2xl font-bold text-white">Meek</h1>
          <Link
            href="/auth/signin"
            className="bg-white text-indigo-900 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100"
          >
            Sign In
          </Link>
        </nav>

        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Cloud-Based Loan Management for Microfinance
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Streamline your lending operations with our comprehensive platform designed for microfinance institutions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-indigo-700 text-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/auth/signin"
              className="bg-white/10 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/20 text-lg border border-white/20"
            >
              View Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <DollarSign className="w-10 h-10 mb-4 text-white" />
            <h3 className="text-xl font-bold text-white mb-3">Loan Management</h3>
            <p className="text-gray-300">
              Complete loan tracking including repayments, schedules, collateral management, fees, and penalties
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <BarChart3 className="w-10 h-10 mb-4 text-white" />
            <h3 className="text-xl font-bold text-white mb-3">Financial Reporting</h3>
            <p className="text-gray-300">
              Real-time charts, cash flow reports, and profit/loss statements for business performance monitoring
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <Users className="w-10 h-10 mb-4 text-white" />
            <h3 className="text-xl font-bold text-white mb-3">Borrower Management</h3>
            <p className="text-gray-300">
              Comprehensive borrower profiles with credit history, payment tracking, and account management
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <CreditCard className="w-10 h-10 mb-4 text-white" />
            <h3 className="text-xl font-bold text-white mb-3">Payment Tracking</h3>
            <p className="text-gray-300">
              Record and track all payments with automated receipt generation and schedule updates
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <Mail className="w-10 h-10 mb-4 text-white" />
            <h3 className="text-xl font-bold text-white mb-3">Communications</h3>
            <p className="text-gray-300">
              Automated SMS and email for payment reminders, confirmations, and borrower engagement
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <Shield className="w-10 h-10 mb-4 text-white" />
            <h3 className="text-xl font-bold text-white mb-3">Role-Based Access</h3>
            <p className="text-gray-300">
              Secure authentication with customizable roles: Admin, Manager, Loan Officer, Cashier, Collector
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-5xl font-bold text-white mb-2">800+</div>
            <div className="text-gray-300">Lending Companies</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-white mb-2">60+</div>
            <div className="text-gray-300">Countries</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-white mb-2">100%</div>
            <div className="text-gray-300">Cloud-Based</div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to transform your loan management?
          </h3>
          <p className="text-xl text-gray-300 mb-8">
            Join hundreds of microfinance institutions worldwide
          </p>
          <Link
            href="/auth/signin"
            className="inline-block bg-indigo-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-indigo-700 text-lg"
          >
            Start Your Free Trial
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 border-t border-white/10">
        <div className="text-center text-gray-400">
          <p>&copy; 2026 Meek. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
