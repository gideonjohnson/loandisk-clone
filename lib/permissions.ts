/**
 * Role-based Permission System
 * Defines all permissions and role mappings for the loan management system
 */

// User roles (matches database schema)
export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'BRANCH_MANAGER'
  | 'LOAN_OFFICER'
  | 'CASHIER'
  | 'TELLER'
  | 'OPERATIONS_MANAGER'
  | 'COLLECTOR'
  | 'ACCOUNTANT'

// Permission definitions
export enum Permission {
  // Borrower permissions
  BORROWER_VIEW = 'borrower:view',
  BORROWER_CREATE = 'borrower:create',
  BORROWER_UPDATE = 'borrower:update',
  BORROWER_DELETE = 'borrower:delete',
  BORROWER_EXPORT = 'borrower:export',

  // Loan permissions
  LOAN_VIEW = 'loan:view',
  LOAN_CREATE = 'loan:create',
  LOAN_UPDATE = 'loan:update',
  LOAN_DELETE = 'loan:delete',
  LOAN_APPROVE = 'loan:approve',
  LOAN_REJECT = 'loan:reject',
  LOAN_DISBURSE = 'loan:disburse',
  LOAN_EXPORT = 'loan:export',

  // Payment permissions
  PAYMENT_VIEW = 'payment:view',
  PAYMENT_CREATE = 'payment:create',
  PAYMENT_UPDATE = 'payment:update',
  PAYMENT_REVERSE = 'payment:reverse',
  PAYMENT_EXPORT = 'payment:export',

  // Fee & Penalty permissions
  FEE_VIEW = 'fee:view',
  FEE_MANAGE = 'fee:manage',
  PENALTY_VIEW = 'penalty:view',
  PENALTY_APPLY = 'penalty:apply',

  // Document permissions
  DOCUMENT_VIEW = 'document:view',
  DOCUMENT_UPLOAD = 'document:upload',
  DOCUMENT_DELETE = 'document:delete',

  // Collateral permissions
  COLLATERAL_VIEW = 'collateral:view',
  COLLATERAL_MANAGE = 'collateral:manage',

  // Account permissions
  ACCOUNT_VIEW = 'account:view',
  ACCOUNT_CREATE = 'account:create',
  ACCOUNT_UPDATE = 'account:update',
  ACCOUNT_DELETE = 'account:delete',
  ACCOUNT_TRANSACTION = 'account:transaction',

  // Reporting permissions
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',
  REPORTS_CUSTOM_CREATE = 'reports:custom-create',

  // Analytics permissions
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_PREDICTIVE = 'analytics:predictive',

  // Admin permissions
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  BRANCH_VIEW = 'branch:view',
  BRANCH_MANAGE = 'branch:manage',

  SETTINGS_VIEW = 'settings:view',
  SETTINGS_MANAGE = 'settings:manage',

  AUDIT_LOG_VIEW = 'audit:view',

  // Notification permissions
  NOTIFICATION_VIEW = 'notification:view',
  NOTIFICATION_SEND = 'notification:send',
}

// Role-based permission mappings
export const rolePermissions: Record<UserRole, Permission[]> = {
  // Admin has all permissions
  ADMIN: Object.values(Permission),

  // Manager has most permissions except system settings
  MANAGER: [
    // Borrowers
    Permission.BORROWER_VIEW,
    Permission.BORROWER_CREATE,
    Permission.BORROWER_UPDATE,
    Permission.BORROWER_DELETE,
    Permission.BORROWER_EXPORT,

    // Loans
    Permission.LOAN_VIEW,
    Permission.LOAN_CREATE,
    Permission.LOAN_UPDATE,
    Permission.LOAN_DELETE,
    Permission.LOAN_APPROVE,
    Permission.LOAN_REJECT,
    Permission.LOAN_DISBURSE,
    Permission.LOAN_EXPORT,

    // Payments
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_CREATE,
    Permission.PAYMENT_UPDATE,
    Permission.PAYMENT_REVERSE,
    Permission.PAYMENT_EXPORT,

    // Fees & Penalties
    Permission.FEE_VIEW,
    Permission.FEE_MANAGE,
    Permission.PENALTY_VIEW,
    Permission.PENALTY_APPLY,

    // Documents & Collateral
    Permission.DOCUMENT_VIEW,
    Permission.DOCUMENT_UPLOAD,
    Permission.DOCUMENT_DELETE,
    Permission.COLLATERAL_VIEW,
    Permission.COLLATERAL_MANAGE,

    // Accounts
    Permission.ACCOUNT_VIEW,
    Permission.ACCOUNT_CREATE,
    Permission.ACCOUNT_UPDATE,
    Permission.ACCOUNT_DELETE,
    Permission.ACCOUNT_TRANSACTION,

    // Reporting & Analytics
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.REPORTS_CUSTOM_CREATE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_PREDICTIVE,

    // Admin (limited)
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.BRANCH_VIEW,
    Permission.SETTINGS_VIEW,
    Permission.AUDIT_LOG_VIEW,

    // Notifications
    Permission.NOTIFICATION_VIEW,
    Permission.NOTIFICATION_SEND,
  ],

  // Branch Manager - manages specific branch operations
  BRANCH_MANAGER: [
    // Borrowers
    Permission.BORROWER_VIEW,
    Permission.BORROWER_CREATE,
    Permission.BORROWER_UPDATE,
    Permission.BORROWER_EXPORT,

    // Loans
    Permission.LOAN_VIEW,
    Permission.LOAN_CREATE,
    Permission.LOAN_UPDATE,
    Permission.LOAN_APPROVE,
    Permission.LOAN_REJECT,
    Permission.LOAN_DISBURSE,
    Permission.LOAN_EXPORT,

    // Payments
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_CREATE,
    Permission.PAYMENT_EXPORT,

    // Fees & Penalties
    Permission.FEE_VIEW,
    Permission.PENALTY_VIEW,
    Permission.PENALTY_APPLY,

    // Documents & Collateral
    Permission.DOCUMENT_VIEW,
    Permission.DOCUMENT_UPLOAD,
    Permission.COLLATERAL_VIEW,
    Permission.COLLATERAL_MANAGE,

    // Accounts
    Permission.ACCOUNT_VIEW,
    Permission.ACCOUNT_CREATE,
    Permission.ACCOUNT_UPDATE,
    Permission.ACCOUNT_TRANSACTION,

    // Reporting
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.ANALYTICS_VIEW,

    // Admin (view only)
    Permission.USER_VIEW,
    Permission.BRANCH_VIEW,
    Permission.AUDIT_LOG_VIEW,

    // Notifications
    Permission.NOTIFICATION_VIEW,
    Permission.NOTIFICATION_SEND,
  ],

  // Loan Officer - creates and manages loans
  LOAN_OFFICER: [
    // Borrowers
    Permission.BORROWER_VIEW,
    Permission.BORROWER_CREATE,
    Permission.BORROWER_UPDATE,

    // Loans
    Permission.LOAN_VIEW,
    Permission.LOAN_CREATE,
    Permission.LOAN_UPDATE,
    Permission.LOAN_EXPORT,

    // Payments
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_EXPORT,

    // Fees & Penalties
    Permission.FEE_VIEW,
    Permission.PENALTY_VIEW,

    // Documents & Collateral
    Permission.DOCUMENT_VIEW,
    Permission.DOCUMENT_UPLOAD,
    Permission.COLLATERAL_VIEW,
    Permission.COLLATERAL_MANAGE,

    // Accounts
    Permission.ACCOUNT_VIEW,

    // Reporting
    Permission.REPORTS_VIEW,
    Permission.ANALYTICS_VIEW,

    // Notifications
    Permission.NOTIFICATION_VIEW,
  ],

  // Cashier - handles payments
  CASHIER: [
    // Borrowers
    Permission.BORROWER_VIEW,

    // Loans
    Permission.LOAN_VIEW,

    // Payments
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_CREATE,
    Permission.PAYMENT_EXPORT,

    // Fees
    Permission.FEE_VIEW,
    Permission.PENALTY_VIEW,

    // Documents
    Permission.DOCUMENT_VIEW,

    // Accounts
    Permission.ACCOUNT_VIEW,
    Permission.ACCOUNT_TRANSACTION,

    // Reporting
    Permission.REPORTS_VIEW,

    // Notifications
    Permission.NOTIFICATION_VIEW,
  ],

  // Teller - view and basic payment operations
  TELLER: [
    // Borrowers
    Permission.BORROWER_VIEW,

    // Loans
    Permission.LOAN_VIEW,

    // Payments
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_CREATE,

    // Documents
    Permission.DOCUMENT_VIEW,

    // Accounts
    Permission.ACCOUNT_VIEW,
    Permission.ACCOUNT_TRANSACTION,

    // Notifications
    Permission.NOTIFICATION_VIEW,
  ],

  // Operations Manager - oversees operations and approvals
  OPERATIONS_MANAGER: [
    // Borrowers
    Permission.BORROWER_VIEW,
    Permission.BORROWER_EXPORT,

    // Loans
    Permission.LOAN_VIEW,
    Permission.LOAN_APPROVE,
    Permission.LOAN_REJECT,
    Permission.LOAN_DISBURSE,
    Permission.LOAN_EXPORT,

    // Payments
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_REVERSE,
    Permission.PAYMENT_EXPORT,

    // Fees & Penalties
    Permission.FEE_VIEW,
    Permission.FEE_MANAGE,
    Permission.PENALTY_VIEW,
    Permission.PENALTY_APPLY,

    // Documents
    Permission.DOCUMENT_VIEW,
    Permission.DOCUMENT_UPLOAD,
    Permission.COLLATERAL_VIEW,

    // Accounts
    Permission.ACCOUNT_VIEW,

    // Reporting & Analytics
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.REPORTS_CUSTOM_CREATE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_PREDICTIVE,

    // Admin
    Permission.USER_VIEW,
    Permission.AUDIT_LOG_VIEW,

    // Notifications
    Permission.NOTIFICATION_VIEW,
    Permission.NOTIFICATION_SEND,
  ],

  // Collector - focuses on collections and overdue payments
  COLLECTOR: [
    // Borrowers
    Permission.BORROWER_VIEW,

    // Loans
    Permission.LOAN_VIEW,

    // Payments
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_CREATE,

    // Penalties
    Permission.PENALTY_VIEW,

    // Documents
    Permission.DOCUMENT_VIEW,

    // Reporting (collections focused)
    Permission.REPORTS_VIEW,

    // Notifications
    Permission.NOTIFICATION_VIEW,
    Permission.NOTIFICATION_SEND,
  ],

  // Accountant - reporting and financial oversight
  ACCOUNTANT: [
    // Borrowers
    Permission.BORROWER_VIEW,
    Permission.BORROWER_EXPORT,

    // Loans
    Permission.LOAN_VIEW,
    Permission.LOAN_EXPORT,

    // Payments
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_EXPORT,

    // Fees & Penalties
    Permission.FEE_VIEW,
    Permission.PENALTY_VIEW,

    // Documents
    Permission.DOCUMENT_VIEW,

    // Accounts
    Permission.ACCOUNT_VIEW,
    Permission.ACCOUNT_EXPORT,

    // Reporting & Analytics (full access)
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.REPORTS_CUSTOM_CREATE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_PREDICTIVE,

    // Admin
    Permission.AUDIT_LOG_VIEW,

    // Notifications
    Permission.NOTIFICATION_VIEW,
  ],
}

/**
 * Check if a role has a specific permission
 * @param role User role
 * @param permission Permission to check
 * @returns true if role has permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = rolePermissions[role]
  return permissions?.includes(permission) || false
}

/**
 * Check if a role has any of the specified permissions
 * @param role User role
 * @param permissions Array of permissions to check
 * @returns true if role has at least one permission
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 * @param role User role
 * @param permissions Array of permissions to check
 * @returns true if role has all permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Get all permissions for a role
 * @param role User role
 * @returns Array of permissions
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role] || []
}
