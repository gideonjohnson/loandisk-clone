# Meek Microfinance — Continuation File
> Last Updated: 2026-02-04

## Project Overview
A comprehensive microfinance loan management system with staff dashboard and borrower self-service portal.

## Tech Stack
- **Framework**: Next.js 16.1.1 (App Router, Turbopack)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon) with Prisma ORM 5.22
- **Auth**: NextAuth.js with TOTP 2FA
- **UI**: Tailwind CSS, shadcn/ui components, Lucide icons, Recharts
- **SMS**: Twilio, Africa's Talking (optional)
- **Email**: Nodemailer (SMTP), SendGrid (optional)
- **Documents**: docx library for DOCX generation

## Current State: DEPLOYED TO VERCEL ✅
- **GitHub Repo**: https://github.com/gideonjohnson/loandisk-clone
- **Vercel Project**: gideons-projects-07acaa4a/loandisk-clone
- **Latest Deploy**: https://loandisk-clone-8ot2msh5z-gideons-projects-07acaa4a.vercel.app
- **Custom Domain**: (pending — user is setting one up)
- Dev server: `http://localhost:3000`
- 29 tests passing (vitest)
- Build: 110 routes compiled, zero errors

## Test Credentials
- **Staff Login**: `/auth/signin` — Email: `admin@meek.com`, Password: `admin123`
- **Customer Portal**: `/portal/login`

---

## All Completed Features

### Core (pre-existing)
- [x] User authentication (NextAuth) with 2FA (TOTP + backup codes)
- [x] E-signature flow (canvas capture, token verification)
- [x] Borrower CRUD with account statements
- [x] Loan creation with amortization schedule (flat + reducing balance)
- [x] Payment recording and tracking
- [x] Dashboard with stats and charts
- [x] Loan calculator (public)
- [x] Borrower self-service portal (apply, track, pay)
- [x] Automated reminders (cron: daily payment + overdue)
- [x] Investor accounts with deposits/withdrawals
- [x] Document templates (DOCX generation with placeholders)
- [x] Granular role-based permissions (9 roles)
- [x] Profit & Loss report, Employee performance report, Aging report
- [x] PostgreSQL (Neon) migration from SQLite
- [x] Vercel deployment with cron jobs

### Phase 1: SMS/Email Runtime Integration ✅
Bridges DB-stored notification settings to runtime email/SMS services.

**What was built:**
- `lib/config/notificationConfig.ts` — DB config helper with 60s cache, env var fallback
- Updated `lib/email/emailService.ts` — async DB-backed config, `sendEmailWithConfig()`
- Updated `lib/sms/smsService.ts` — async DB-backed config, `sendSMSWithConfig()`
- `app/api/settings/test-email/route.ts` — test email endpoint
- `app/api/settings/test-sms/route.ts` — test SMS endpoint
- Rewrote `app/api/settings/route.ts` — category filter, flat-object format support, cache clearing
- Updated `app/dashboard/settings/notifications/page.tsx` — test phone number field
- Installed `twilio` and `africastalking` npm packages

### Phase 2: Enhanced Security ✅
Login tracking, device management, session control, IP rules, security alerts.

**Schema models added** (in `prisma/schema.prisma`):
- `LoginHistory` — userId, ipAddress, userAgent, deviceType, browser, os, location, status, failureReason
- `UserDevice` — userId, deviceFingerprint, deviceName, deviceType, browser, os, lastIpAddress, isTrusted (@@unique userId+fingerprint)
- `UserSession` — userId, sessionToken, deviceId, ipAddress, userAgent, isActive, lastActivity, expiresAt, revokedAt
- `IPRule` — ipAddress, type (WHITELIST/BLACKLIST), reason, createdBy, expiresAt, active (@@unique ipAddress+type)
- `SecurityAlert` — userId, type, title, message, severity, acknowledged, metadata

**Services created:**
- `lib/security/loginHistoryService.ts` — recordLogin, getLoginHistory, UA parsing
- `lib/security/deviceService.ts` — SHA-256 fingerprinting, register/trust/remove devices
- `lib/security/sessionService.ts` — create/revoke/cleanup sessions
- `lib/security/ipRuleService.ts` — add/check/remove IP rules (ALLOW/DENY/NEUTRAL)
- `lib/security/securityAlertService.ts` — create/get/acknowledge alerts

**API routes:**
- `app/api/security/login-history/route.ts` — GET
- `app/api/security/devices/route.ts` — GET, DELETE
- `app/api/security/devices/[id]/trust/route.ts` — POST
- `app/api/security/sessions/route.ts` — GET, DELETE (single or all)
- `app/api/security/ip-rules/route.ts` — GET, POST, DELETE
- `app/api/security/alerts/route.ts` — GET, PUT (acknowledge)

**Auth integration** (`app/api/auth/check-2fa/route.ts` rewritten):
- IP blacklist checking at login
- Failed login recording + spike detection (5+ in 15 min → SecurityAlert)
- Device fingerprinting + new device alerts
- Login history recording

**UI pages:**
- `app/dashboard/settings/security/page.tsx` — expanded with tabbed sections: 2FA (existing), Login History, Devices, Sessions, Alerts
- `app/dashboard/settings/ip-rules/page.tsx` — IP whitelist/blacklist management with add form, stats, table

**Permissions added:** `SECURITY_VIEW`, `SECURITY_MANAGE`, `IP_RULES_MANAGE`

### Phase 3: KYC/AML Verification ✅
Identity verification workflow with document submission and AML screening.

**Schema model added:**
- `KYCVerification` — borrowerId, status (NOT_STARTED/PENDING/UNDER_REVIEW/VERIFIED/REJECTED), documents (front/back/selfie/proof), documentType, documentNumber, AML status/flags, review notes/reason

**Services:**
- `lib/kyc/kycService.ts` — initiateKYC, submitDocuments, reviewKYC, getStatus, getPendingReviews
- `lib/kyc/amlService.ts` — blacklist check, duplicate ID/phone/email detection, name fuzzy matching

**API routes:**
- `app/api/kyc/route.ts` — GET (list with ?status=), POST (initiate)
- `app/api/kyc/[id]/route.ts` — GET (detail), PUT (submit docs)
- `app/api/kyc/[id]/review/route.ts` — POST (approve/reject, runs AML check before approval)
- `app/api/kyc/aml-check/route.ts` — POST (standalone AML check)
- `app/api/portal/kyc/route.ts` — GET/POST (borrower portal, cookie auth)

**UI pages:**
- `app/dashboard/kyc/page.tsx` — staff KYC dashboard with status filters, AML badges, stats
- `app/dashboard/kyc/[id]/page.tsx` — KYC review page with document viewer, borrower info, AML results, approve/reject
- `app/portal/kyc/page.tsx` — borrower portal KYC with progress steps, document submission form

**Permissions added:** `KYC_VIEW`, `KYC_REVIEW`, `KYC_MANAGE`

### Phase 4: Fraud Detection ✅
Rule-based scoring engine integrated into loan creation.

**Uses existing `FraudCheck` model** (no migration needed).

**Service:**
- `lib/fraud/fraudDetectionService.ts` — 5 weighted rules:
  - Velocity Check (25pts) — loan applications in last 30 days
  - Identity Duplication (30pts) — same phone/email/idNumber across borrowers
  - Amount Anomaly (20pts) — request vs income/credit score
  - Payment History (15pts) — prior defaults
  - Info Consistency (10pts) — recent profile changes
  - Composite score 0-100, suspicious if ≥60
  - `runFraudCheck()`, `getFraudChecks()`, `reviewFraudCheck()` (CONFIRM → blacklists borrower)

**API routes:**
- `app/api/fraud/route.ts` — GET (list with ?suspicious=, ?borrowerId=, ?loanId=), POST (manual check)
- `app/api/fraud/[id]/route.ts` — GET (detail), PUT (review: CLEAR/CONFIRM)
- `app/api/fraud/borrower/[borrowerId]/route.ts` — GET (all checks for borrower)

**Loan integration:**
- `app/api/loans/route.ts` — runs fraud check after loan creation, returns fraudAlert if suspicious
- `app/api/portal/loans/apply/route.ts` — same integration for borrower portal applications

**UI pages:**
- `app/dashboard/fraud/page.tsx` — fraud dashboard with stats, filter tabs, risk score badges
- `app/dashboard/fraud/[id]/page.tsx` — fraud detail with rule-by-rule breakdown, borrower info, Clear/Confirm actions
- `app/dashboard/loans/[id]/page.tsx` — added fraud alert card with risk score, flags, review link

**Permissions added:** `FRAUD_VIEW`, `FRAUD_REVIEW`

### Phase 5: Predictive Analytics & Forecasting ✅
Portfolio health monitoring, cash flow projections, loan risk scoring, early warnings.

**Schema models added:**
- `PortfolioSnapshot` — snapshotDate, totalLoans, activeLoans, totalDisbursed, totalOutstanding, totalCollected, totalOverdue, portfolioAtRisk, averageLoanSize, defaultRate, collectionRate, newLoansCount/Amount, branchId (@@unique date+branch)
- `LoanRiskScore` — loanId, riskScore (0-100), riskLevel, factors (JSON), predictedDefault, calculatedAt

**Services:**
- `lib/analytics/portfolioSnapshotService.ts` — captureSnapshot (aggregates all metrics), getSnapshotTrends
- `lib/analytics/cashFlowForecastService.ts` — forecastCashFlow (expected/optimistic/pessimistic, 6 months)
- `lib/analytics/loanRiskService.ts` — scoreLoanRisk (5 factors: daysPastDue, paymentConsistency, creditScore, dtiRatio, loanAge), scoreAllActiveLoans (batch)
- `lib/analytics/earlyWarningService.ts` — DETERIORATING_PAYMENTS, APPROACHING_MATURITY, BORROWER_STRESS

**API routes:**
- `app/api/analytics/snapshot/route.ts` — POST/GET (cron-compatible, API key or session auth)
- `app/api/analytics/trends/route.ts` — GET portfolio trends
- `app/api/analytics/forecast/route.ts` — GET cash flow forecast
- `app/api/analytics/at-risk/route.ts` — GET at-risk loans
- `app/api/analytics/warnings/route.ts` — GET early warnings
- `app/api/analytics/risk-scoring/route.ts` — POST/GET (cron-compatible batch scoring)

**Cron jobs** (in `vercel.json`):
- Monthly snapshot: `0 0 1 * *` → `/api/analytics/snapshot`
- Daily risk scoring: `0 2 * * *` → `/api/analytics/risk-scoring`

**UI page:**
- `app/dashboard/reports/portfolio-health/page.tsx` — key metrics with trend arrows, LineChart trends, BarChart forecast, at-risk loans table, early warnings panel
- Added Portfolio Health link to `app/dashboard/reports/page.tsx`

### Phase 6: PWA Mobile App ✅
Progressive Web App for the borrower portal.

**Files created:**
- `public/manifest.json` — PWA manifest (standalone, portrait, blue theme)
- `public/icons/icon-192.svg`, `public/icons/icon-512.svg` — SVG app icons
- `components/portal/BottomNav.tsx` — fixed bottom nav (Home, Loans, Apply, KYC, Profile), md:hidden
- `components/portal/InstallPrompt.tsx` — beforeinstallprompt listener, dismissible install banner
- `app/portal/offline/page.tsx` — offline fallback page
- `hooks/usePullToRefresh.ts` — touch-based pull-to-refresh hook
- `scripts/generate-icons.js` — SVG/PNG icon generator (optional sharp dependency)

**Files modified:**
- `app/layout.tsx` — PWA manifest link, viewport themeColor, apple-web-app meta tags
- `app/portal/layout.tsx` — added BottomNav, InstallPrompt, KYC nav link, pb-20 for mobile, hidden footer on mobile

**Dashboard navigation updates:**
- `app/dashboard/layout.tsx` — added KYC and Fraud nav items in sidebar

---

## Database Models (Complete)

```
User, Borrower, Loan, LoanSchedule, Payment, PaymentSchedule
LoanProduct, LoanApproval, Branch, BranchStaff
Collateral, Guarantor, Fee
SignatureRequest, TwoFactorAuth
Investor, InvestorAccount, InvestorTransaction
DocumentTemplate, SystemSetting, Notification
ActivityLog, AuditLog
FraudCheck, CreditScore
LoginHistory, UserDevice, UserSession, IPRule, SecurityAlert
KYCVerification
PortfolioSnapshot, LoanRiskScore
```

## Permissions (All)

```
BORROWER_VIEW, BORROWER_CREATE, BORROWER_EDIT, BORROWER_DELETE
LOAN_VIEW, LOAN_CREATE, LOAN_APPROVE, LOAN_DISBURSE, LOAN_EDIT
PAYMENT_VIEW, PAYMENT_CREATE, PAYMENT_VOID
FEE_VIEW, FEE_CREATE
DOCUMENT_VIEW, DOCUMENT_CREATE
COLLATERAL_VIEW, COLLATERAL_CREATE, COLLATERAL_EDIT
ACCOUNT_VIEW, ACCOUNT_CREATE, ACCOUNT_EDIT
REPORTS_VIEW, REPORTS_EXPORT
SETTINGS_VIEW, SETTINGS_MANAGE
USER_VIEW, USER_CREATE, USER_EDIT
NOTIFICATION_VIEW, NOTIFICATION_MANAGE
ANALYTICS_VIEW, ANALYTICS_PREDICTIVE
SECURITY_VIEW, SECURITY_MANAGE, IP_RULES_MANAGE
KYC_VIEW, KYC_REVIEW, KYC_MANAGE
FRAUD_VIEW, FRAUD_REVIEW
```

## Key File Locations

### Services
| Service | Path |
|---------|------|
| Auth | `lib/auth.ts` |
| 2FA | `lib/auth/twoFactorService.ts` |
| E-Signature | `lib/esignature/esignatureService.ts` |
| Email | `lib/email/emailService.ts` |
| SMS | `lib/sms/smsService.ts` |
| Notification Config | `lib/config/notificationConfig.ts` |
| Credit Scoring | `lib/credit/creditScoringService.ts` |
| Notifications | `lib/notifications/notificationService.ts` |
| Permissions | `lib/permissions.ts` |
| Auth Middleware | `lib/middleware/withAuth.ts` |
| Login History | `lib/security/loginHistoryService.ts` |
| Device Tracking | `lib/security/deviceService.ts` |
| Session Management | `lib/security/sessionService.ts` |
| IP Rules | `lib/security/ipRuleService.ts` |
| Security Alerts | `lib/security/securityAlertService.ts` |
| KYC | `lib/kyc/kycService.ts` |
| AML | `lib/kyc/amlService.ts` |
| Fraud Detection | `lib/fraud/fraudDetectionService.ts` |
| Portfolio Snapshots | `lib/analytics/portfolioSnapshotService.ts` |
| Cash Flow Forecast | `lib/analytics/cashFlowForecastService.ts` |
| Loan Risk Scoring | `lib/analytics/loanRiskService.ts` |
| Early Warnings | `lib/analytics/earlyWarningService.ts` |
| Document Templates | `lib/documents/templateService.ts` |
| Loan Calculator | `lib/utils/loanCalculator.ts` |

### UI Pages
| Page | Path |
|------|------|
| Dashboard | `app/dashboard/page.tsx` |
| Borrowers | `app/dashboard/borrowers/page.tsx` |
| Loans | `app/dashboard/loans/page.tsx` |
| Loan Detail | `app/dashboard/loans/[id]/page.tsx` |
| KYC Dashboard | `app/dashboard/kyc/page.tsx` |
| KYC Review | `app/dashboard/kyc/[id]/page.tsx` |
| Fraud Dashboard | `app/dashboard/fraud/page.tsx` |
| Fraud Detail | `app/dashboard/fraud/[id]/page.tsx` |
| Portfolio Health | `app/dashboard/reports/portfolio-health/page.tsx` |
| Reports | `app/dashboard/reports/page.tsx` |
| P&L Report | `app/dashboard/reports/profit-loss/page.tsx` |
| Employee Perf | `app/dashboard/reports/employee-performance/page.tsx` |
| Security Settings | `app/dashboard/settings/security/page.tsx` |
| IP Rules | `app/dashboard/settings/ip-rules/page.tsx` |
| Notification Settings | `app/dashboard/settings/notifications/page.tsx` |
| Permissions | `app/dashboard/settings/permissions/page.tsx` |
| Portal Home | `app/portal/page.tsx` |
| Portal KYC | `app/portal/kyc/page.tsx` |
| Portal Apply | `app/portal/apply/page.tsx` |
| Offline | `app/portal/offline/page.tsx` |

### Config
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema |
| `next.config.ts` | Next.js config (standalone output, security headers) |
| `vercel.json` | Cron jobs (4 scheduled tasks) |
| `public/manifest.json` | PWA manifest |
| `middleware.ts` | NextAuth route protection |

## Commands

```bash
npm run dev          # Start dev server
npm test             # Run 29 tests
npm run build        # Production build
npx prisma generate  # Regenerate Prisma client
npx prisma db push   # Push schema changes
npx prisma db seed   # Seed database
npx prisma studio    # Visual database browser
npx vercel --prod    # Deploy to Vercel
git push origin master  # Push to GitHub
```

## Environment Variables (Vercel)

```
DATABASE_URL          — Neon PostgreSQL connection string
NEXTAUTH_SECRET       — Auth secret
NEXTAUTH_URL          — Production URL
CRON_SECRET           — API key for cron job authentication
# Optional:
EMAIL_PROVIDER, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
SENDGRID_API_KEY, EMAIL_FROM
SMS_PROVIDER, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
AT_API_KEY, AT_USERNAME, AT_SENDER_ID
```

## Resume Instructions
1. Read this file first for full context
2. Run `npm run dev` to start the dev server
3. Run `npm test` to verify tests pass
4. Check the plan file at `.claude/plans/velvety-drifting-walrus.md` for the original implementation plan
5. All 6 planned features are complete — see "Potential Next Steps" below

## Potential Next Steps
- [ ] Custom domain setup on Vercel (user is working on this)
- [ ] Serwist service worker for offline caching (PWA enhancement)
- [ ] Third-party KYC/AML provider integration (e.g. Smile ID, Onfido)
- [ ] Real-time notifications (WebSocket or SSE)
- [ ] Audit log UI page
- [ ] Batch loan processing
- [ ] Multi-currency support
- [ ] API rate limiting
- [ ] Comprehensive test coverage expansion
