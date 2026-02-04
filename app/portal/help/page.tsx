'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HelpCircle, ChevronDown, ChevronUp, Phone, Mail, Clock, CreditCard, Wallet, Shield, User } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQSection {
  title: string
  icon: React.ReactNode
  items: FAQItem[]
}

const faqSections: FAQSection[] = [
  {
    title: 'Loans',
    icon: <CreditCard className="w-5 h-5 text-blue-600" />,
    items: [
      {
        question: 'How do I apply for a loan?',
        answer: 'Go to the "Apply for Loan" page from the navigation menu. Select a loan product, enter the desired amount and term, then submit your application. You will receive a notification once your application has been reviewed.',
      },
      {
        question: 'How long does loan approval take?',
        answer: 'Most loan applications are reviewed within 24-48 hours. Complex applications or those requiring additional documentation may take longer. You can track your application status on the "My Applications" page.',
      },
      {
        question: 'What determines my loan limit?',
        answer: 'Your loan limit is based on several factors including your credit score, monthly income, employment status, repayment history, and KYC verification status. Completing your KYC verification can help increase your limit.',
      },
      {
        question: 'Can I have multiple active loans?',
        answer: 'Yes, you may have multiple active loans depending on your creditworthiness and the lending policies. Each new application is evaluated based on your overall debt obligations and repayment capacity.',
      },
    ],
  },
  {
    title: 'Payments',
    icon: <Wallet className="w-5 h-5 text-green-600" />,
    items: [
      {
        question: 'How do I make a payment?',
        answer: 'You can make payments through M-Pesa, bank transfer, or at any of our branches. Go to the "Payments" page and follow the instructions for your preferred payment method.',
      },
      {
        question: 'What happens if I miss a payment?',
        answer: 'Late payments may incur penalties and affect your credit score. If you anticipate difficulty making a payment, please contact us as early as possible to discuss alternative arrangements.',
      },
      {
        question: 'Can I make early repayments?',
        answer: 'Yes, you can make early or extra payments at any time without penalty. Early payments are applied to your outstanding balance and can reduce your overall interest charges.',
      },
      {
        question: 'How do I get a payment receipt?',
        answer: 'Payment receipts are automatically generated for each payment and can be viewed on the "Payments" page under payment history. You can also download them from the "Documents" section.',
      },
    ],
  },
  {
    title: 'KYC & Verification',
    icon: <Shield className="w-5 h-5 text-purple-600" />,
    items: [
      {
        question: 'What is KYC verification?',
        answer: 'KYC (Know Your Customer) verification is a process to confirm your identity. It involves submitting identification documents such as your national ID, passport, or driving license along with a selfie for verification.',
      },
      {
        question: 'Why do I need to complete KYC?',
        answer: 'KYC verification is required by financial regulations and helps protect your account. Completing KYC may also unlock higher loan limits and access to additional loan products.',
      },
      {
        question: 'How long does KYC verification take?',
        answer: 'Automated KYC verification typically completes within minutes. Manual review, if required, may take up to 24 hours. You will be notified once your verification is complete.',
      },
      {
        question: 'What documents do I need for KYC?',
        answer: 'You will need a valid government-issued ID (national ID, passport, or driving license) and a clear selfie photo. Additional documents such as proof of address or income may be requested for certain loan products.',
      },
    ],
  },
  {
    title: 'Account',
    icon: <User className="w-5 h-5 text-orange-600" />,
    items: [
      {
        question: 'How do I update my profile information?',
        answer: 'Go to the "Profile" page from the navigation menu. You can update your email, address, employment status, and other editable fields. Some fields like your name and ID number can only be changed by contacting support.',
      },
      {
        question: 'How do I change my PIN?',
        answer: 'Visit the "Profile" page and scroll to the "Change PIN" section. Enter your current PIN followed by your new PIN and confirm it. Your PIN must be exactly 4 digits.',
      },
      {
        question: 'I forgot my PIN. What do I do?',
        answer: 'On the login page, use the "Forgot PIN" option to reset your PIN via your registered phone number. You will receive an OTP to verify your identity before setting a new PIN.',
      },
      {
        question: 'How do I contact customer support?',
        answer: 'You can reach us by phone at +254 700 000 000 during business hours (Mon-Fri, 8AM-6PM EAT), or by email at support@meekfund.ink anytime. We aim to respond to all emails within 24 hours.',
      },
    ],
  },
]

export default function HelpPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Help Center</h1>
        <p className="text-gray-600 mt-1">Find answers to frequently asked questions</p>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-6 mb-8">
        {faqSections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center gap-3">
              {section.icon}
              <h2 className="font-semibold text-gray-900">{section.title}</h2>
            </div>
            <div className="divide-y">
              {section.items.map((item, idx) => {
                const key = `${section.title}-${idx}`
                const isOpen = openItems[key]
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900 pr-4">{item.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Contact Info Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Contact Us</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Phone</p>
              <p className="text-sm text-gray-600">+254 700 000 000</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-600">support@meekfund.ink</p>
            </div>
          </div>
          <div className="flex items-start gap-3 col-span-2 sm:col-span-1">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Business Hours</p>
              <p className="text-sm text-gray-600">Mon - Fri, 8AM - 6PM EAT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/portal/loans"
            className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
          >
            <CreditCard className="w-4 h-4" />
            My Loans
          </Link>
          <Link
            href="/portal/payments"
            className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
          >
            <Wallet className="w-4 h-4" />
            Payments
          </Link>
          <Link
            href="/portal/profile"
            className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
          >
            <User className="w-4 h-4" />
            Profile
          </Link>
          <Link
            href="/portal/kyc"
            className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
          >
            <Shield className="w-4 h-4" />
            KYC
          </Link>
        </div>
      </div>
    </div>
  )
}
