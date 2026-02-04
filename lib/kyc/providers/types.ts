/**
 * KYC Provider Interface Types
 */

export interface KYCProviderConfig {
  apiKey: string
  partnerId?: string
  callbackUrl?: string
  sandbox?: boolean
}

export interface KYCVerificationRequest {
  borrowerId: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  idNumber: string
  idType: 'NATIONAL_ID' | 'PASSPORT' | 'DRIVERS_LICENSE'
  country?: string
  selfieImage?: string // Base64 encoded
  idFrontImage?: string // Base64 encoded
  idBackImage?: string // Base64 encoded
}

export interface KYCVerificationResult {
  providerId: string
  providerName: string
  status: 'VERIFIED' | 'REJECTED' | 'PENDING' | 'ERROR'
  score?: number
  result?: string
  message?: string
  details?: Record<string, unknown>
  verifiedAt?: Date
}

export interface AMLCheckResult {
  status: 'CLEAR' | 'FLAGGED' | 'PENDING' | 'ERROR'
  flags?: string[]
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
  details?: Record<string, unknown>
}

export interface KYCProvider {
  name: string

  /**
   * Initiate KYC verification
   */
  initiateVerification(request: KYCVerificationRequest): Promise<{
    providerId: string
    status: 'PENDING' | 'ERROR'
    webUrl?: string // URL for user to complete verification
    message?: string
  }>

  /**
   * Check verification status
   */
  checkVerificationStatus(providerId: string): Promise<KYCVerificationResult>

  /**
   * Run AML check
   */
  runAMLCheck(request: {
    firstName: string
    lastName: string
    dateOfBirth?: string
    country?: string
  }): Promise<AMLCheckResult>

  /**
   * Handle webhook callback
   */
  handleWebhook(payload: unknown): Promise<KYCVerificationResult | null>
}
