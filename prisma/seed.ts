import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@loandisk.com' },
    update: {},
    create: {
      email: 'admin@loandisk.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      active: true,
    },
  })

  console.log('Created admin user:', admin.email)

  // Create a loan officer
  const loanOfficerPassword = await bcrypt.hash('officer123', 10)

  const loanOfficer = await prisma.user.upsert({
    where: { email: 'officer@loandisk.com' },
    update: {},
    create: {
      email: 'officer@loandisk.com',
      name: 'Loan Officer',
      password: loanOfficerPassword,
      role: 'LOAN_OFFICER',
      active: true,
    },
  })

  console.log('Created loan officer:', loanOfficer.email)

  // Create some sample borrowers
  const borrower1 = await prisma.borrower.create({
    data: {
      firstName: 'John',
      lastName: 'Kamau',
      email: 'john.kamau@example.com',
      phone: '+254712345678',
      address: '123 Kenyatta Avenue',
      city: 'Nairobi',
      country: 'Kenya',
      dateOfBirth: new Date('1985-05-15'),
      idNumber: '12345678',
      employmentStatus: 'Employed',
      monthlyIncome: 150000, // KSh 150,000
      creditScore: 720,
      active: true,
    },
  })

  const borrower2 = await prisma.borrower.create({
    data: {
      firstName: 'Jane',
      lastName: 'Wanjiku',
      email: 'jane.wanjiku@example.com',
      phone: '+254723456789',
      address: '456 Moi Avenue',
      city: 'Mombasa',
      country: 'Kenya',
      dateOfBirth: new Date('1990-08-22'),
      idNumber: '23456789',
      employmentStatus: 'Self-Employed',
      monthlyIncome: 200000, // KSh 200,000
      creditScore: 680,
      active: true,
    },
  })

  console.log('Created sample borrowers:', borrower1.firstName, borrower2.firstName)

  // Create sample loans (amounts in KSh)
  const loan1 = await prisma.loan.create({
    data: {
      loanNumber: 'LN-2026-0001',
      borrowerId: borrower1.id,
      loanOfficerId: loanOfficer.id,
      principalAmount: 500000, // KSh 500,000
      interestRate: 14.0,
      termMonths: 12,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'ACTIVE',
      purpose: 'Business expansion',
      approvalDate: new Date('2025-12-28'),
      disbursementDate: new Date('2026-01-01'),
    },
  })

  const loan2 = await prisma.loan.create({
    data: {
      loanNumber: 'LN-2026-0002',
      borrowerId: borrower2.id,
      loanOfficerId: loanOfficer.id,
      principalAmount: 250000, // KSh 250,000
      interestRate: 12.0,
      termMonths: 6,
      startDate: new Date('2026-01-02'),
      endDate: new Date('2026-06-30'),
      status: 'PENDING',
      purpose: 'Working capital',
    },
  })

  console.log('Created sample loans:', loan1.loanNumber, loan2.loanNumber)

  // Create loan schedules for loan1
  // KSh 500,000 at 14% for 12 months = ~44,925 monthly payment
  const monthlyPayment = 44925
  for (let i = 0; i < 12; i++) {
    const dueDate = new Date('2026-02-01')
    dueDate.setMonth(dueDate.getMonth() + i)

    const principalDue = 41667 // ~500,000 / 12
    const interestDue = 3258 // Approximate interest portion

    await prisma.loanSchedule.create({
      data: {
        loanId: loan1.id,
        dueDate,
        principalDue,
        interestDue,
        feesDue: 0,
        totalDue: monthlyPayment,
        principalPaid: 0,
        interestPaid: 0,
        feesPaid: 0,
        totalPaid: 0,
        isPaid: false,
      },
    })
  }

  console.log('Created loan schedules for loan 1')

  // Create a sample payment for loan1
  const payment = await prisma.payment.create({
    data: {
      loanId: loan1.id,
      amount: 44925,
      paymentDate: new Date('2026-02-01'),
      receivedBy: loanOfficer.id,
      paymentMethod: 'M-Pesa',
      receiptNumber: 'RCP-2026-0001',
      notes: 'First payment received via M-Pesa',
      status: 'COMPLETED',
      principalAmount: 41667,
      interestAmount: 3258,
      feesAmount: 0,
    },
  })

  console.log('Created sample payment:', payment.receiptNumber)

  console.log('Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
