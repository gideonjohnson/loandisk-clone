# Meek - Continuation File
> Last Updated: 2026-01-31

## Project Overview
A comprehensive microfinance loan management system.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Auth**: NextAuth.js
- **UI**: Tailwind CSS, Lucide icons, Recharts
- **Documents**: docx library for DOCX generation

## Current State: DEPLOYED TO VERCEL ✅
- **Production URL**: https://meek.vercel.app
- **GitHub Repo**: https://github.com/gideonjohnson/meek
- Dev server runs on `http://localhost:3000`
- 29 tests passing
- Database seeded with test data (local only)

## Test Credentials
- **Staff Login**: `http://localhost:3000/auth/signin`
  - Email: `admin@meek.com`
  - Password: `admin123`
- **Customer Portal**: `http://localhost:3000/portal/login`

## Completed Features

### Core Functionality
- [x] User authentication (NextAuth)
- [x] Borrower CRUD operations
- [x] Loan creation with amortization schedule
- [x] Payment recording and tracking
- [x] Dashboard with stats and charts
- [x] Loan calculator (public)
- [x] Customer portal (borrower self-service)

### Recently Completed (This Session)
- [x] **E-Signature Flow**
  - SignatureRequest model in Prisma schema
  - Token-based verification API (`/api/signature/verify`)
  - Canvas signature capture (`/app/sign/[token]`)
  - Signature management on loan detail page

- [x] **Two-Factor Authentication (2FA)**
  - TOTP-based using `otplib`
  - QR code generation for authenticator apps
  - Backup codes (10 codes, XXXX-XXXX format)
  - Security settings page (`/dashboard/settings/security`)
  - Login flow with 2FA challenge
  - API routes: setup, verify, disable, backup-codes, login-verify, check-2fa

- [x] **Testing**
  - Vitest + React Testing Library
  - 29 tests across 4 files:
    - `__tests__/lib/loanCalculator.test.ts` (10 tests)
    - `__tests__/lib/twoFactorService.test.ts` (8 tests)
    - `__tests__/lib/esignatureService.test.ts` (4 tests)
    - `__tests__/components/Button.test.tsx` (7 tests)

- [x] **UI Polish**
  - Loading skeletons on dashboard
  - Mobile card views for tables
  - Responsive term selector on calculator

## Recently Completed (This Session - Continued)

### Customer Account Statement ✅
- Individual borrower detail page with full account info
- Transaction history (disbursements, payments, fees, penalties)
- Downloadable CSV statement
- Date range filtering
- Loan history with expandable payment schedules
- **Files created**:
  - `app/dashboard/borrowers/[id]/page.tsx`
  - `app/api/borrowers/[id]/statement/route.ts`

### Company Profit & Loss Report ✅
- Income breakdown: Interest, fees, penalties
- Expenses: Provisions for bad debt
- Net profit calculation
- Monthly/quarterly/yearly period options
- Branch filtering
- Interactive charts (bar/line) with Recharts
- CSV export
- **Files created**:
  - `app/dashboard/reports/profit-loss/page.tsx`
  - `app/api/reports/profit-loss/route.ts`

### Employee/Loan Officer Performance Report ✅
- Loans managed per officer with active count
- Total disbursed and collected amounts
- Interest, fees, and penalties breakdown
- Collection rate percentage
- Commission calculations (configurable rate)
- Top performers leaderboard
- Expandable employee details
- Sortable table columns
- CSV export
- **Files created**:
  - `app/dashboard/reports/employee-performance/page.tsx`
  - `app/api/reports/employee-performance/route.ts`

### Vercel Deployment ✅
- Successfully deployed to Vercel
- Fixed multiple TypeScript build errors:
  - Missing `penaltyAmount` parameter in overdue emails
  - `LoanSchedule` using `isPaid` instead of `status`
  - `setFont` font name parameter
  - ZodError `.issues` instead of `.errors`
  - Vitest `beforeEach` import
  - Prisma generate in build scripts

**Production Setup Needed:**
1. Configure cloud database (Supabase/PlanetScale/Neon)
2. Set Vercel environment variables:
   - `DATABASE_URL` - Production database URL
   - `NEXTAUTH_SECRET` - Secure secret
   - `NEXTAUTH_URL` - `https://meek.vercel.app`
   - Optional: `SMS_PROVIDER`, `EMAIL_PROVIDER` configs
3. Run database migrations and seed

### New Features Added (This Session)

#### Rebranding to Meek
- Removed all "loandisk" references
- Updated emails to `@meek.com`
- Updated documentation and config

#### PostgreSQL + Neon Database
- Migrated from SQLite to PostgreSQL
- Connected to Neon cloud database (MeekLoan project)
- Production database synced and seeded

#### Automated Reminders (Cron Jobs)
- `vercel.json` configured with cron schedules
- Daily payment reminders at 8 AM UTC
- Overdue notifications at 9 AM UTC

#### Aging/Collection Report
- Portfolio at Risk (PAR) analysis
- Aging buckets: Current, 1-30, 31-60, 61-90, 91-180, 180+ days
- Overdue loans breakdown with contact info
- Charts and CSV export
- `/dashboard/reports/aging`

#### Investor Accounts
- Full investor management (CRUD)
- Investment accounts with interest tracking
- Deposits/withdrawals/interest credits
- Transaction history
- `/dashboard/investors`

**New Models:**
- Investor
- InvestorAccount
- InvestorTransaction

#### Document Templates (DOCX) ✅
- Template management UI at `/dashboard/templates`
- Create/edit templates with markdown-like syntax
- Placeholder system: `{{borrower_name}}`, `{{loan_amount}}`, etc.
- Categories: borrower, loan, payment, collateral, date
- DOCX generation using `docx` library
- Preview and download filled documents
- **Files created**:
  - `lib/documents/templateService.ts`
  - `app/api/templates/route.ts`
  - `app/api/templates/generate/route.ts`
  - `app/dashboard/templates/page.tsx`

#### Granular Permissions ✅
- Role-based permission management at `/dashboard/settings/permissions`
- Permission categories: Borrowers, Loans, Payments, Fees, Documents, Collateral, Accounts, Reports, Admin, Notifications
- Visual permission grid with toggle buttons
- Roles: Admin, Manager, Branch Manager, Operations Manager, Loan Officer, Cashier, Teller, Collector, Accountant
- Admin always has all permissions (cannot be modified)
- Stored in SystemSetting table as JSON
- **Files created**:
  - `app/api/settings/permissions/route.ts`
  - `app/dashboard/settings/permissions/page.tsx`

#### SMS/Email Integration Settings ✅
- Notification settings UI at `/dashboard/settings/notifications`
- Email providers: SMTP (nodemailer), SendGrid
- SMS providers: Twilio, Africa's Talking
- Provider configuration with API keys, sender IDs
- Provider enable/disable toggles
- **Dependencies added**: `nodemailer`, `@sendgrid/mail`, `docx`
- **Files created**:
  - `app/dashboard/settings/notifications/page.tsx`

## Pending Features (Future Enhancements)

## Key File Locations

### Database
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Seed: `prisma/seed.ts`

### Authentication
- NextAuth config: `lib/auth.ts`
- 2FA Service: `lib/auth/twoFactorService.ts`
- Sign-in page: `app/auth/signin/page.tsx`

### E-Signature
- Service: `lib/esignature/esignatureService.ts`
- Signing page: `app/sign/[token]/page.tsx`
- APIs: `app/api/signature/`

### Reports
- Reports page: `app/dashboard/reports/page.tsx`
- APIs: `app/api/reports/`

### Tests
- Config: `vitest.config.ts`
- Setup: `vitest.setup.ts`
- Tests: `__tests__/`

## Commands

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Seed database
npx prisma db seed

# View database
npx prisma studio

# Deploy to Vercel
npx vercel --prod

# Push to GitHub
git push origin master
```

## Database Models (Key ones)

```
User - Staff/admin accounts
Borrower - Loan customers
Loan - Loan records with schedule
Payment - Payment transactions
PaymentSchedule - Amortization schedule items
SignatureRequest - E-signature tracking
TwoFactorAuth - 2FA secrets and backup codes
```

## Notes
- Production database: Neon PostgreSQL (MeekLoan project)
- Database URL configured via Vercel environment variables
- Email/SMS providers configurable via Settings > Notifications

## Resume Instructions
1. Read this file first
2. Run `npm run dev` to start server
3. Continue with "Pending Features" section above
4. User specifically requested: Customer Account Statement, Company P&L, Employee P&L
