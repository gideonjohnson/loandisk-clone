import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/setup?key=meek-seed-2026
 * Create missing database tables and columns
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key !== 'meek-seed-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: string[] = []

  // Helper to run SQL safely
  async function run(label: string, sql: string) {
    try {
      await prisma.$executeRawUnsafe(sql)
      results.push(`OK: ${label}`)
    } catch (e) {
      results.push(`SKIP: ${label} - ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  try {
    // -- Missing columns on User table --
    await run('User.mustChangePassword', `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN DEFAULT false`)
    await run('User.profileImage', `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileImage" TEXT`)
    await run('User.resetToken', `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT`)
    await run('User.resetTokenExpiry', `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3)`)
    await run('User.twoFactorEnabled', `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT false`)
    await run('User.lastLogin', `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3)`)
    await run('User.resetToken_unique', `CREATE UNIQUE INDEX IF NOT EXISTS "User_resetToken_key" ON "User"("resetToken")`)

    // -- Missing columns on Borrower table --
    await run('Borrower.portalPin', `ALTER TABLE "Borrower" ADD COLUMN IF NOT EXISTS "portalPin" TEXT`)
    await run('Borrower.portalEnabled', `ALTER TABLE "Borrower" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN DEFAULT false`)

    // -- Missing columns on Payment table --
    await run('Payment.paymentTransactionId', `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentTransactionId" TEXT`)

    // -- TwoFactorAuth --
    await run('TwoFactorAuth', `CREATE TABLE IF NOT EXISTS "TwoFactorAuth" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "secret" TEXT NOT NULL,
      "backupCodes" TEXT,
      "verifiedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TwoFactorAuth_pkey" PRIMARY KEY ("id")
    )`)
    await run('TwoFactorAuth_userId_key', `CREATE UNIQUE INDEX IF NOT EXISTS "TwoFactorAuth_userId_key" ON "TwoFactorAuth"("userId")`)

    // -- SystemSetting --
    await run('SystemSetting', `CREATE TABLE IF NOT EXISTS "SystemSetting" (
      "id" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "key" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "description" TEXT,
      "type" TEXT NOT NULL DEFAULT 'text',
      "isPublic" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
    )`)
    await run('SystemSetting_key_key', `CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key")`)

    // -- SignatureRequest --
    await run('SignatureRequest', `CREATE TABLE IF NOT EXISTS "SignatureRequest" (
      "id" TEXT NOT NULL,
      "loanId" TEXT NOT NULL,
      "borrowerId" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "documentType" TEXT NOT NULL DEFAULT 'LOAN_AGREEMENT',
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "signatureData" TEXT,
      "signedAt" TIMESTAMP(3),
      "viewedAt" TIMESTAMP(3),
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id")
    )`)
    await run('SignatureRequest_token_key', `CREATE UNIQUE INDEX IF NOT EXISTS "SignatureRequest_token_key" ON "SignatureRequest"("token")`)

    // -- Investor --
    await run('Investor', `CREATE TABLE IF NOT EXISTS "Investor" (
      "id" TEXT NOT NULL,
      "firstName" TEXT NOT NULL,
      "lastName" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "address" TEXT,
      "city" TEXT,
      "country" TEXT,
      "idNumber" TEXT,
      "taxId" TEXT,
      "bankName" TEXT,
      "bankAccount" TEXT,
      "bankBranch" TEXT,
      "notes" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
    )`)
    await run('Investor_email_key', `CREATE UNIQUE INDEX IF NOT EXISTS "Investor_email_key" ON "Investor"("email")`)
    await run('Investor_idNumber_key', `CREATE UNIQUE INDEX IF NOT EXISTS "Investor_idNumber_key" ON "Investor"("idNumber")`)

    // -- InvestorAccount --
    await run('InvestorAccount', `CREATE TABLE IF NOT EXISTS "InvestorAccount" (
      "id" TEXT NOT NULL,
      "accountNumber" TEXT NOT NULL,
      "investorId" TEXT NOT NULL,
      "accountType" TEXT NOT NULL DEFAULT 'INVESTMENT',
      "principalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
      "interestRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
      "interestEarned" DECIMAL(65,30) NOT NULL DEFAULT 0,
      "maturityDate" TIMESTAMP(3),
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InvestorAccount_pkey" PRIMARY KEY ("id")
    )`)
    await run('InvestorAccount_accountNumber_key', `CREATE UNIQUE INDEX IF NOT EXISTS "InvestorAccount_accountNumber_key" ON "InvestorAccount"("accountNumber")`)

    // -- InvestorTransaction --
    await run('InvestorTransaction', `CREATE TABLE IF NOT EXISTS "InvestorTransaction" (
      "id" TEXT NOT NULL,
      "investorId" TEXT NOT NULL,
      "accountId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "amount" DECIMAL(65,30) NOT NULL,
      "balanceBefore" DECIMAL(65,30) NOT NULL,
      "balanceAfter" DECIMAL(65,30) NOT NULL,
      "description" TEXT,
      "referenceNumber" TEXT,
      "processedBy" TEXT,
      "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InvestorTransaction_pkey" PRIMARY KEY ("id")
    )`)

    // -- LoginHistory --
    await run('LoginHistory', `CREATE TABLE IF NOT EXISTS "LoginHistory" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "deviceType" TEXT,
      "browser" TEXT,
      "os" TEXT,
      "location" TEXT,
      "status" TEXT NOT NULL,
      "failureReason" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
    )`)

    // -- UserDevice --
    await run('UserDevice', `CREATE TABLE IF NOT EXISTS "UserDevice" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "deviceFingerprint" TEXT NOT NULL,
      "deviceName" TEXT,
      "deviceType" TEXT,
      "browser" TEXT,
      "os" TEXT,
      "lastIpAddress" TEXT,
      "isTrusted" BOOLEAN NOT NULL DEFAULT false,
      "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
    )`)
    await run('UserDevice_unique', `CREATE UNIQUE INDEX IF NOT EXISTS "UserDevice_userId_deviceFingerprint_key" ON "UserDevice"("userId", "deviceFingerprint")`)

    // -- UserSession --
    await run('UserSession', `CREATE TABLE IF NOT EXISTS "UserSession" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "sessionToken" TEXT NOT NULL,
      "deviceId" TEXT,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "revokedAt" TIMESTAMP(3),
      "revokedReason" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
    )`)
    await run('UserSession_sessionToken_key', `CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_sessionToken_key" ON "UserSession"("sessionToken")`)

    // -- IPRule --
    await run('IPRule', `CREATE TABLE IF NOT EXISTS "IPRule" (
      "id" TEXT NOT NULL,
      "ipAddress" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "reason" TEXT,
      "createdBy" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3),
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "IPRule_pkey" PRIMARY KEY ("id")
    )`)
    await run('IPRule_unique', `CREATE UNIQUE INDEX IF NOT EXISTS "IPRule_ipAddress_type_key" ON "IPRule"("ipAddress", "type")`)

    // -- SecurityAlert --
    await run('SecurityAlert', `CREATE TABLE IF NOT EXISTS "SecurityAlert" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
      "acknowledged" BOOLEAN NOT NULL DEFAULT false,
      "acknowledgedAt" TIMESTAMP(3),
      "metadata" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SecurityAlert_pkey" PRIMARY KEY ("id")
    )`)

    // -- KYCVerification --
    await run('KYCVerification', `CREATE TABLE IF NOT EXISTS "KYCVerification" (
      "id" TEXT NOT NULL,
      "borrowerId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
      "submittedAt" TIMESTAMP(3),
      "reviewedAt" TIMESTAMP(3),
      "reviewedBy" TEXT,
      "reviewNotes" TEXT,
      "rejectionReason" TEXT,
      "idFrontUrl" TEXT,
      "idBackUrl" TEXT,
      "selfieUrl" TEXT,
      "proofOfAddress" TEXT,
      "documentType" TEXT,
      "documentNumber" TEXT,
      "amlCheckStatus" TEXT DEFAULT 'PENDING',
      "amlCheckDate" TIMESTAMP(3),
      "amlFlags" TEXT,
      "providerId" TEXT,
      "providerName" TEXT,
      "providerResult" TEXT,
      "providerScore" INTEGER,
      "providerVerifiedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "KYCVerification_pkey" PRIMARY KEY ("id")
    )`)

    // -- PortfolioSnapshot --
    await run('PortfolioSnapshot', `CREATE TABLE IF NOT EXISTS "PortfolioSnapshot" (
      "id" TEXT NOT NULL,
      "snapshotDate" TIMESTAMP(3) NOT NULL,
      "totalLoans" INTEGER NOT NULL,
      "activeLoans" INTEGER NOT NULL,
      "totalDisbursed" DECIMAL(65,30) NOT NULL,
      "totalOutstanding" DECIMAL(65,30) NOT NULL,
      "totalCollected" DECIMAL(65,30) NOT NULL,
      "totalOverdue" DECIMAL(65,30) NOT NULL,
      "portfolioAtRisk" DECIMAL(65,30) NOT NULL,
      "averageLoanSize" DECIMAL(65,30) NOT NULL,
      "defaultRate" DECIMAL(65,30) NOT NULL,
      "collectionRate" DECIMAL(65,30) NOT NULL,
      "newLoansCount" INTEGER NOT NULL,
      "newLoansAmount" DECIMAL(65,30) NOT NULL,
      "writeOffs" DECIMAL(65,30) NOT NULL DEFAULT 0,
      "branchId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
    )`)
    await run('PortfolioSnapshot_unique', `CREATE UNIQUE INDEX IF NOT EXISTS "PortfolioSnapshot_snapshotDate_branchId_key" ON "PortfolioSnapshot"("snapshotDate", "branchId")`)

    // -- LoanRiskScore --
    await run('LoanRiskScore', `CREATE TABLE IF NOT EXISTS "LoanRiskScore" (
      "id" TEXT NOT NULL,
      "loanId" TEXT NOT NULL,
      "riskScore" INTEGER NOT NULL,
      "riskLevel" TEXT NOT NULL,
      "factors" TEXT NOT NULL,
      "predictedDefault" BOOLEAN NOT NULL,
      "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LoanRiskScore_pkey" PRIMARY KEY ("id")
    )`)

    // -- BatchJob --
    await run('BatchJob', `CREATE TABLE IF NOT EXISTS "BatchJob" (
      "id" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "fileName" TEXT,
      "totalRecords" INTEGER NOT NULL DEFAULT 0,
      "processedRecords" INTEGER NOT NULL DEFAULT 0,
      "successCount" INTEGER NOT NULL DEFAULT 0,
      "errorCount" INTEGER NOT NULL DEFAULT 0,
      "errors" TEXT,
      "createdBy" TEXT NOT NULL,
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BatchJob_pkey" PRIMARY KEY ("id")
    )`)

    // -- PaymentTransaction --
    await run('PaymentTransaction', `CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
      "id" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "transactionType" TEXT NOT NULL,
      "checkoutRequestId" TEXT,
      "merchantRequestId" TEXT,
      "mpesaReceiptNumber" TEXT,
      "airtelTransactionId" TEXT,
      "bankReference" TEXT,
      "phoneNumber" TEXT,
      "amount" DECIMAL(65,30) NOT NULL,
      "accountReference" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "resultCode" TEXT,
      "resultDesc" TEXT,
      "loanId" TEXT,
      "borrowerId" TEXT,
      "transactionDate" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
    )`)

    // -- LoanProduct --
    await run('LoanProduct', `CREATE TABLE IF NOT EXISTS "LoanProduct" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "description" TEXT,
      "minAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
      "maxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
      "minTerm" INTEGER NOT NULL DEFAULT 1,
      "maxTerm" INTEGER NOT NULL DEFAULT 60,
      "interestRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
      "interestType" TEXT NOT NULL DEFAULT 'FLAT',
      "repaymentFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
      "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
      "lateFeeType" TEXT NOT NULL DEFAULT 'FIXED',
      "lateFeeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
      "processingFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
      "insuranceFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
      "requiresCollateral" BOOLEAN NOT NULL DEFAULT false,
      "requiresGuarantor" BOOLEAN NOT NULL DEFAULT false,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LoanProduct_pkey" PRIMARY KEY ("id")
    )`)
    await run('LoanProduct_code_key', `CREATE UNIQUE INDEX IF NOT EXISTS "LoanProduct_code_key" ON "LoanProduct"("code")`)

    // -- Foreign key constraints (add safely) --
    const fks = [
      ['SignatureRequest_loanId_fkey', 'SignatureRequest', 'loanId', 'Loan', 'id'],
      ['SignatureRequest_borrowerId_fkey', 'SignatureRequest', 'borrowerId', 'Borrower', 'id'],
      ['InvestorAccount_investorId_fkey', 'InvestorAccount', 'investorId', 'Investor', 'id'],
      ['InvestorTransaction_investorId_fkey', 'InvestorTransaction', 'investorId', 'Investor', 'id'],
      ['InvestorTransaction_accountId_fkey', 'InvestorTransaction', 'accountId', 'InvestorAccount', 'id'],
      ['LoginHistory_userId_fkey', 'LoginHistory', 'userId', 'User', 'id'],
      ['UserDevice_userId_fkey', 'UserDevice', 'userId', 'User', 'id'],
      ['UserSession_userId_fkey', 'UserSession', 'userId', 'User', 'id'],
      ['SecurityAlert_userId_fkey', 'SecurityAlert', 'userId', 'User', 'id'],
      ['KYCVerification_borrowerId_fkey', 'KYCVerification', 'borrowerId', 'Borrower', 'id'],
      ['KYCVerification_reviewedBy_fkey', 'KYCVerification', 'reviewedBy', 'User', 'id'],
      ['LoanRiskScore_loanId_fkey', 'LoanRiskScore', 'loanId', 'Loan', 'id'],
      ['BatchJob_createdBy_fkey', 'BatchJob', 'createdBy', 'User', 'id'],
      ['PaymentTransaction_loanId_fkey', 'PaymentTransaction', 'loanId', 'Loan', 'id'],
      ['PaymentTransaction_borrowerId_fkey', 'PaymentTransaction', 'borrowerId', 'Borrower', 'id'],
    ]

    for (const [name, table, col, refTable, refCol] of fks) {
      await run(`FK ${name}`, `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
          ALTER TABLE "${table}" ADD CONSTRAINT "${name}" FOREIGN KEY ("${col}") REFERENCES "${refTable}"("${refCol}") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$`)
    }

    // -- Remove demo/seed accounts --
    const demoEmails = ['admin@meek.com', 'officer@meek.com']
    const userIdTables = ['LoginHistory', 'UserDevice', 'UserSession', 'SecurityAlert', 'Notification', 'ActivityLog']
    for (const demoEmail of demoEmails) {
      try {
        // Delete dependent records first
        for (const table of userIdTables) {
          await prisma.$executeRawUnsafe(
            `DELETE FROM "${table}" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" = '${demoEmail}')`
          )
        }
        await prisma.$executeRawUnsafe(
          `DELETE FROM "BatchJob" WHERE "createdBy" IN (SELECT "id" FROM "User" WHERE "email" = '${demoEmail}')`
        )
        await prisma.$executeRawUnsafe(
          `DELETE FROM "KYCVerification" WHERE "reviewedBy" IN (SELECT "id" FROM "User" WHERE "email" = '${demoEmail}')`
        )
        }
        const deleted = await prisma.$executeRawUnsafe(
          `DELETE FROM "User" WHERE "email" = '${demoEmail}'`
        )
        results.push(deleted > 0 ? `DELETED: ${demoEmail}` : `SKIP: ${demoEmail} (not found)`)
      } catch (e) {
        results.push(`SKIP: delete ${demoEmail} - ${e instanceof Error ? e.message : 'error'}`)
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results,
    }, { status: 500 })
  }
}
