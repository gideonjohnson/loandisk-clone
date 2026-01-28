# Meek - Microfinance Loan Management System

A comprehensive cloud-based loan management platform built with Next.js, designed for microfinance institutions to streamline lending operations.

## Features

- **Borrower Management**: Complete borrower profiles with credit history and tracking
- **Loan Management**: Full loan lifecycle management including applications, approvals, disbursements, and tracking
- **Payment Processing**: Record and track payments with automated schedule updates
- **Financial Reporting**: Real-time analytics, portfolio summaries, and performance metrics
- **Role-Based Access Control**: Secure authentication with multiple user roles (Admin, Manager, Loan Officer, etc.)
- **Automated Calculations**: Loan schedules, interest calculations, and amortization

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS 4
- **Backend**: Next.js API Routes
- **Authentication**: NextAuth.js
- **Database**: SQLite (via Prisma ORM)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd loandisk-clone
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (already configured):
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Seed the database with sample data:
```bash
npx prisma db seed
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Default Login Credentials

After seeding the database, you can log in with:

**Admin User:**
- Email: `admin@loandisk.com`
- Password: `admin123`

**Loan Officer:**
- Email: `officer@loandisk.com`
- Password: `officer123`

## Project Structure

```
loandisk-clone/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth authentication
│   │   ├── borrowers/    # Borrower CRUD operations
│   │   ├── loans/        # Loan CRUD operations
│   │   ├── payments/     # Payment operations
│   │   └── dashboard/    # Dashboard statistics
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # Protected dashboard pages
│   │   ├── borrowers/    # Borrower management
│   │   ├── loans/        # Loan management
│   │   ├── payments/     # Payment management
│   │   └── reports/      # Financial reports
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── components/           # React components
├── lib/                  # Utility libraries
│   ├── auth.ts          # NextAuth configuration
│   ├── prisma.ts        # Prisma client
│   └── utils/           # Helper functions
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seeder
└── types/               # TypeScript type definitions
```

## Database Schema

The application uses the following main models:

- **User**: System users with role-based access
- **Borrower**: Customer profiles
- **Loan**: Loan records with status tracking
- **LoanSchedule**: Payment schedules for each loan
- **Payment**: Payment transactions
- **Collateral**: Loan collateral information
- **Account**: Borrower savings/investor accounts
- **Transaction**: Account transactions
- **Document**: Document management
- **Setting**: System settings

## Key Features

### Borrower Management
- Add new borrowers with comprehensive profiles
- Track credit scores and employment status
- View borrower loan history
- Manage borrower accounts

### Loan Processing
- Create new loan applications
- Automated loan schedule generation
- Loan approval workflow
- Track loan status (Pending, Approved, Active, Paid, Defaulted)
- Calculate monthly payments and interest

### Payment Recording
- Record loan payments
- Allocate payments to principal, interest, and fees
- Update loan schedules automatically
- Generate receipt numbers

### Reports & Analytics
- Portfolio overview with key metrics
- Loan status distribution
- Collection efficiency tracking
- Financial summaries
- Average interest rates
- Portfolio at risk analysis

## User Roles

- **ADMIN**: Full system access
- **MANAGER**: Manage operations and view reports
- **BRANCH_MANAGER**: Branch-level management
- **LOAN_OFFICER**: Process loans and manage borrowers
- **CASHIER**: Record payments
- **COLLECTOR**: Track collections
- **ACCOUNTANT**: Financial reporting

## Development

### Build for Production
```bash
npm run build
```

### Run Production Build
```bash
npm start
```

### Database Commands
```bash
# Generate Prisma Client
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

## Security Notes

- Change `NEXTAUTH_SECRET` in production to a secure random string
- Update default user passwords after first login
- Configure proper CORS and rate limiting for production
- Use environment variables for sensitive configuration
- Enable HTTPS in production

## License

This project is for educational purposes.
