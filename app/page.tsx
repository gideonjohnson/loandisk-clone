'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import {
  DollarSign, BarChart3, Users, CreditCard, Mail, Shield, Calculator, ArrowRight,
  CheckCircle, Globe, Clock, Smartphone, Lock, TrendingUp, Bell,
  Building2, Percent, Wallet, ChevronDown, Star, Moon, Sun, Menu, X, MessageCircle,
  Play, Check, Minus
} from 'lucide-react'

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
}

// FAQ Data
const faqs = [
  {
    question: "How long does it take to set up Meek?",
    answer: "You can get started in minutes! Simply sign up, configure your loan products, and you're ready to start managing loans. Our onboarding wizard guides you through the entire setup process."
  },
  {
    question: "Is my data secure with Meek?",
    answer: "Absolutely. We use bank-grade 256-bit SSL encryption, two-factor authentication, and role-based access controls. Your data is hosted on secure cloud servers with daily backups and 99.9% uptime guarantee."
  },
  {
    question: "Can I migrate my existing loan data to Meek?",
    answer: "Yes! We offer free data migration assistance. Our team will help you import your existing borrowers, loans, and payment history from spreadsheets or other systems."
  },
  {
    question: "Does Meek support mobile money payments?",
    answer: "Yes, Meek integrates with popular mobile money providers including M-Pesa, Airtel Money, and MTN Mobile Money. We also support bank transfers and cash payments."
  },
  {
    question: "Can I customize loan products and interest calculations?",
    answer: "Absolutely. Meek supports flat rate, reducing balance, and compound interest methods. You can create unlimited loan products with custom terms, fees, and penalty structures."
  },
  {
    question: "Is there a limit on the number of borrowers?",
    answer: "Our Starter plan supports up to 50 borrowers. Professional and Enterprise plans offer unlimited borrowers, making Meek perfect for growing institutions."
  }
]

// Testimonials Data
const testimonials = [
  {
    name: "Sarah Kimani",
    role: "CEO, Sunrise Microfinance",
    image: "/testimonials/sarah.jpg",
    content: "Meek transformed our operations. We reduced loan processing time by 70% and our default rate dropped significantly. The automated reminders alone saved us countless hours.",
    rating: 5
  },
  {
    name: "James Ochieng",
    role: "Operations Manager, Unity SACCO",
    image: "/testimonials/james.jpg",
    content: "The reporting features are incredible. We now have real-time visibility into our portfolio performance. The customer support team is also very responsive.",
    rating: 5
  },
  {
    name: "Grace Muthoni",
    role: "Director, QuickLoans Ltd",
    image: "/testimonials/grace.jpg",
    content: "We've been using Meek for 2 years now. It scales perfectly with our growth - from 100 to over 5,000 borrowers. Highly recommend for any lending business.",
    rating: 5
  }
]

// Comparison Data
const comparisonFeatures = [
  { name: "Cloud-based access", meek: true, others: "partial" },
  { name: "Mobile responsive", meek: true, others: "partial" },
  { name: "Automated SMS reminders", meek: true, others: false },
  { name: "Multiple interest methods", meek: true, others: true },
  { name: "Custom loan products", meek: true, others: "partial" },
  { name: "Real-time reporting", meek: true, others: false },
  { name: "E-signature support", meek: true, others: false },
  { name: "Two-factor authentication", meek: true, others: "partial" },
  { name: "API access", meek: true, others: false },
  { name: "Free data migration", meek: true, others: false },
]

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors">
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 bg-[#4169E1] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25"
              >
                <span className="text-white font-bold text-xl">M</span>
              </motion.div>
              <span className="font-semibold text-xl text-gray-900 dark:text-white">Meek</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Features</Link>
              <Link href="#solutions" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Solutions</Link>
              <Link href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</Link>
              <Link href="#faq" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">FAQ</Link>
              <Link href="/calculator" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Calculator</Link>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link
                href="/auth/signin"
                className="hidden sm:block text-[#4169E1] font-semibold hover:text-[#3457c9] transition-colors"
              >
                Login
              </Link>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/auth/signin"
                  className="bg-[#4169E1] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#3457c9] transition-all shadow-lg shadow-blue-500/25"
                >
                  Get Started
                </Link>
              </motion.div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 dark:text-gray-300"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800"
          >
            <div className="px-4 py-4 space-y-3">
              <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300">Features</Link>
              <Link href="#solutions" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300">Solutions</Link>
              <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300">Pricing</Link>
              <Link href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300">FAQ</Link>
              <Link href="/calculator" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300">Calculator</Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/hero-bg.jpg"
            alt="Modern business building representing financial growth"
            fill
            className="object-cover"
            priority
            quality={75}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/95 via-[#0a1628]/80 to-[#0a1628]/60"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-2xl"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-white/90 text-sm">Trusted by 800+ lending companies worldwide</span>
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Modern Loan Management Software for Microfinance
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-base sm:text-lg text-white/80 mb-8">
              Automate your lending operations, reduce defaults, and grow your portfolio with our cloud-based loan management system.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center bg-[#FFD700] text-gray-900 px-8 py-4 rounded-xl font-semibold hover:bg-[#e6c200] text-base shadow-lg transition-all"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                className="inline-flex items-center justify-center bg-white/10 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 text-base border border-white/30 backdrop-blur-sm transition-all"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </motion.button>
            </motion.div>
            <motion.div variants={fadeInUp} className="flex items-center gap-6 mt-8 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                14-day free trial
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Client Logos */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm uppercase tracking-wider">Trusted by leading financial institutions</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {['KCB Bank', 'Equity Bank', 'KWFT', 'Faulu', 'SMEP', 'Musoni'].map((client, i) => (
              <motion.div
                key={client}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="text-2xl font-bold text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 transition-colors cursor-default"
              >
                {client}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="py-16 bg-white dark:bg-gray-950"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '800+', label: 'Companies' },
              { value: '60+', label: 'Countries' },
              { value: '$2B+', label: 'Loans Managed' },
              { value: '99.9%', label: 'Uptime' }
            ].map((stat, i) => (
              <motion.div key={i} variants={scaleIn} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-[#4169E1]">{stat.value}</div>
                <div className="text-gray-500 dark:text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* What is Meek Section */}
      <section className="py-20 lg:py-28 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeInUp} className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                What is Meek Loan Management Software?
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-base text-gray-600 dark:text-gray-300 mb-6">
                Meek is a comprehensive cloud-based loan management system designed specifically for microfinance institutions, SACCOs, money lenders, and credit unions.
              </motion.p>
              <motion.ul variants={staggerContainer} className="space-y-4">
                {[
                  'Complete loan origination and underwriting automation',
                  'Automated repayment tracking and collection management',
                  'Real-time financial reporting and analytics dashboard',
                  'SMS and email notifications for borrowers and staff'
                ].map((item, i) => (
                  <motion.li key={i} variants={fadeInUp} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-300">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/feature-1.jpg"
                  alt="Team working on business plan in modern office"
                  width={800}
                  height={600}
                  className="w-full h-auto object-cover"
                  quality={75}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="absolute -bottom-6 -left-6 bg-[#4169E1] text-white p-6 rounded-xl shadow-lg"
              >
                <div className="text-3xl font-bold">40%</div>
                <div className="text-sm text-white/80">Reduction in defaults</div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 lg:py-28 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for Modern Lending
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-base max-w-2xl mx-auto">
              Everything you need to manage loans efficiently, reduce risk, and scale your business
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              { icon: DollarSign, title: 'Loan Origination', desc: 'Streamline applications with customizable forms and automated approval workflows.', color: 'blue' },
              { icon: TrendingUp, title: 'Portfolio Management', desc: 'Track your entire loan portfolio with real-time updates on disbursements and arrears.', color: 'green' },
              { icon: Users, title: 'Borrower Management', desc: 'Comprehensive profiles with KYC documents, credit history, and tracking.', color: 'cyan' },
              { icon: Percent, title: 'Flexible Interest Rates', desc: 'Support for flat, reducing balance, and compound interest methods.', color: 'yellow' },
              { icon: Bell, title: 'Automated Reminders', desc: 'SMS and email notifications for payment due dates and overdue alerts.', color: 'purple' },
              { icon: BarChart3, title: 'Financial Reports', desc: 'Generate aging reports, cash flow statements, and regulatory filings.', color: 'red' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 sm:p-8 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-14 h-14 bg-${feature.color}-100 dark:bg-${feature.color}-900/30 rounded-xl flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-7 h-7 text-${feature.color}-600 dark:text-${feature.color}-400`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-gray-500 dark:text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-20 lg:py-28 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/feature-2.jpg"
                  alt="Loan officer meeting with clients"
                  width={800}
                  height={600}
                  className="w-full h-auto object-cover"
                  quality={75}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="order-1 lg:order-2"
            >
              <motion.h2 variants={fadeInUp} className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Built for Every Type of Lender
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-base text-gray-600 dark:text-gray-300 mb-8">
                Whether you&apos;re a small money lender or a large microfinance institution, Meek scales with your business.
              </motion.p>
              <motion.div variants={staggerContainer} className="space-y-6">
                {[
                  { icon: Building2, title: 'Microfinance Institutions', desc: 'Manage thousands of borrowers with group lending and branch management.', color: 'blue' },
                  { icon: Wallet, title: 'SACCOs & Credit Unions', desc: 'Member management, share capital tracking, and dividend calculations.', color: 'green' },
                  { icon: CreditCard, title: 'Money Lenders & Fintechs', desc: 'Quick disbursements, mobile money integration, and automated collections.', color: 'yellow' },
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeInUp} className="flex items-start gap-4">
                    <div className={`w-12 h-12 bg-${item.color}-100 dark:bg-${item.color}-900/30 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-6 h-6 text-${item.color}-600 dark:text-${item.color}-400`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                      <p className="text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Loved by Lending Professionals
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-base max-w-2xl mx-auto">
              See what our customers have to say about Meek
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                whileHover={{ y: -5 }}
                className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">&quot;{testimonial.content}&quot;</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#4169E1] rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 lg:py-28 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why Meek Stands Out
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-base">
              See how we compare to traditional loan management solutions
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-gray-950 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            <div className="grid grid-cols-3 bg-gray-100 dark:bg-gray-800 p-4 font-semibold text-gray-900 dark:text-white">
              <div>Feature</div>
              <div className="text-center text-[#4169E1]">Meek</div>
              <div className="text-center">Others</div>
            </div>
            {comparisonFeatures.map((feature, i) => (
              <div key={i} className="grid grid-cols-3 p-4 border-t border-gray-100 dark:border-gray-800 items-center">
                <div className="text-gray-600 dark:text-gray-300">{feature.name}</div>
                <div className="text-center">
                  <Check className="w-5 h-5 text-green-500 mx-auto" />
                </div>
                <div className="text-center">
                  {feature.others === true ? (
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  ) : feature.others === false ? (
                    <X className="w-5 h-5 text-red-500 mx-auto" />
                  ) : (
                    <Minus className="w-5 h-5 text-yellow-500 mx-auto" />
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-28 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-base max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {/* Starter */}
            <motion.div variants={scaleIn} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Starter</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">For small lenders</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">Free</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Up to 50 borrowers', 'Basic reporting', 'Email support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/auth/signin" className="block w-full text-center py-3 border-2 border-[#4169E1] text-[#4169E1] rounded-xl font-semibold hover:bg-[#4169E1] hover:text-white transition-all">
                  Get Started
                </Link>
              </motion.div>
            </motion.div>

            {/* Professional */}
            <motion.div variants={scaleIn} className="bg-[#4169E1] rounded-2xl p-8 relative shadow-xl shadow-blue-500/25">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FFD700] text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Professional</h3>
              <p className="text-white/70 mb-4">For growing institutions</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$49</span>
                <span className="text-white/70">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited borrowers', 'Advanced analytics', 'SMS notifications', 'Priority support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-white">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/auth/signin" className="block w-full text-center py-3 bg-white text-[#4169E1] rounded-xl font-semibold hover:bg-gray-100 transition-all">
                  Start Free Trial
                </Link>
              </motion.div>
            </motion.div>

            {/* Enterprise */}
            <motion.div variants={scaleIn} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Enterprise</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">For large organizations</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Multi-branch support', 'Custom integrations', 'Dedicated account manager', 'On-premise option'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/auth/signin" className="block w-full text-center py-3 border-2 border-[#4169E1] text-[#4169E1] rounded-xl font-semibold hover:bg-[#4169E1] hover:text-white transition-all">
                  Contact Sales
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 lg:py-28 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-base">
              Got questions? We&apos;ve got answers.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="space-y-4"
          >
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-4 text-gray-600 dark:text-gray-300"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 bg-[#4169E1]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeInUp} className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Lending Business?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-base sm:text-lg text-white/90 mb-10">
              Join 800+ lending companies that trust Meek to manage their loan portfolios
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center bg-white text-[#4169E1] px-10 py-4 rounded-xl font-semibold hover:bg-gray-100 text-base shadow-lg transition-all"
                >
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/calculator"
                  className="inline-flex items-center justify-center bg-transparent text-white px-10 py-4 rounded-xl font-semibold hover:bg-white/10 text-base border-2 border-white/50 transition-all"
                >
                  Try Loan Calculator
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#4169E1] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">M</span>
                </div>
                <span className="font-semibold text-xl text-white">Meek</span>
              </div>
              <p className="text-gray-400 text-sm">
                Cloud-based loan management software for microfinance institutions, SACCOs, and money lenders.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/calculator" className="hover:text-white transition-colors">Loan Calculator</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Security</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; 2026 Meek. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-gray-400">
              <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
              <Link href="#" className="hover:text-white transition-colors">LinkedIn</Link>
              <Link href="#" className="hover:text-white transition-colors">Facebook</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Live Chat Widget */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#4169E1] text-white rounded-full shadow-lg shadow-blue-500/25 flex items-center justify-center z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>

      {/* Chat Popup */}
      {chatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 right-6 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
        >
          <div className="bg-[#4169E1] p-4 text-white">
            <h3 className="font-semibold">Chat with us</h3>
            <p className="text-sm text-white/80">We typically reply within minutes</p>
          </div>
          <div className="p-4 h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-center text-sm">
              👋 Hi there! How can we help you today?
            </p>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <input
              type="text"
              placeholder="Type your message..."
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4169E1]"
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}
