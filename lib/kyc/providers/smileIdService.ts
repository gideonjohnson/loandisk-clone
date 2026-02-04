/**
 * Smile ID KYC Provider Integration
 * https://docs.smileidentity.com/
 */

import type {
  KYCProvider,
  KYCProviderConfig,
  KYCVerificationRequest,
  KYCVerificationResult,
  AMLCheckResult,
} from './types'

// Smile ID SDK types
interface SmileWebToken {
  token: string
  timestamp: string
}

interface SmileJobResult {
  ResultCode: string
  ResultText: string
  SmileJobID: string
  PartnerParams: {
    job_id: string
    user_id: string
    job_type: number
  }
  ConfidenceValue: string
  Actions?: {
    Verify_ID_Number: string
    Return_Personal_Info: string
    Human_Review_Compare: string
    Liveness_Check: string
    Register_Selfie: string
    Selfie_To_ID_Card_Compare: string
  }
}

const SMILE_ID_BASE_URL = process.env.SMILE_ID_SANDBOX === 'true'
  ? 'https://testapi.smileidentity.com/v1'
  : 'https://api.smileidentity.com/v1'

export class SmileIdProvider implements KYCProvider {
  name = 'Smile ID'
  private apiKey: string
  private partnerId: string
  private callbackUrl: string

  constructor(config: KYCProviderConfig) {
    this.apiKey = config.apiKey
    this.partnerId = config.partnerId || ''
    this.callbackUrl = config.callbackUrl || ''
  }

  /**
   * Generate signature for Smile ID API
   */
  private async generateSignature(timestamp: string): Promise<string> {
    const crypto = await import('crypto')
    const data = `${timestamp}${this.partnerId}sid_request`
    return crypto.createHmac('sha256', this.apiKey).update(data).digest('base64')
  }

  /**
   * Get web token for client-side SDK
   */
  async getWebToken(userId: string): Promise<SmileWebToken> {
    const timestamp = new Date().toISOString()
    const signature = await this.generateSignature(timestamp)

    const response = await fetch(`${SMILE_ID_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        partner_id: this.partnerId,
        timestamp,
        signature,
        user_id: userId,
        job_type: 1, // Basic KYC
        callback_url: this.callbackUrl,
      }),
    })

    if (!response.ok) {
      throw new Error(`Smile ID token error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      token: data.token,
      timestamp,
    }
  }

  /**
   * Initiate KYC verification
   */
  async initiateVerification(request: KYCVerificationRequest): Promise<{
    providerId: string
    status: 'PENDING' | 'ERROR'
    webUrl?: string
    message?: string
  }> {
    try {
      const timestamp = new Date().toISOString()
      const signature = await this.generateSignature(timestamp)
      const jobId = `kyc_${request.borrowerId}_${Date.now()}`

      // For server-side verification with images
      if (request.selfieImage && request.idFrontImage) {
        const response = await fetch(`${SMILE_ID_BASE_URL}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            partner_id: this.partnerId,
            timestamp,
            signature,
            partner_params: {
              job_id: jobId,
              user_id: request.borrowerId,
              job_type: 1,
            },
            images: [
              {
                image_type_id: 0, // Selfie
                image: request.selfieImage,
              },
              {
                image_type_id: 1, // ID Front
                image: request.idFrontImage,
              },
              ...(request.idBackImage
                ? [{ image_type_id: 5, image: request.idBackImage }]
                : []),
            ],
            id_info: {
              country: request.country || 'KE',
              id_type: this.mapIdType(request.idType),
              id_number: request.idNumber,
              first_name: request.firstName,
              last_name: request.lastName,
              dob: request.dateOfBirth,
            },
            callback_url: this.callbackUrl,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          return {
            providerId: jobId,
            status: 'ERROR',
            message: error.error || response.statusText,
          }
        }

        const data = await response.json()

        return {
          providerId: data.smile_job_id || jobId,
          status: 'PENDING',
          message: 'Verification submitted successfully',
        }
      }

      // For client-side SDK (return web token URL)
      const token = await this.getWebToken(request.borrowerId)

      return {
        providerId: jobId,
        status: 'PENDING',
        webUrl: `https://smileidentity.com/verify?token=${token.token}&partner_id=${this.partnerId}`,
        message: 'Please complete verification using the provided link',
      }
    } catch (error) {
      console.error('Smile ID initiate verification error:', error)
      return {
        providerId: `error_${Date.now()}`,
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Check verification status
   */
  async checkVerificationStatus(providerId: string): Promise<KYCVerificationResult> {
    try {
      const timestamp = new Date().toISOString()
      const signature = await this.generateSignature(timestamp)

      const response = await fetch(`${SMILE_ID_BASE_URL}/job_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: this.partnerId,
          timestamp,
          signature,
          job_id: providerId,
        }),
      })

      if (!response.ok) {
        return {
          providerId,
          providerName: this.name,
          status: 'ERROR',
          message: `Status check failed: ${response.statusText}`,
        }
      }

      const data: SmileJobResult = await response.json()

      return this.parseJobResult(data)
    } catch (error) {
      console.error('Smile ID check status error:', error)
      return {
        providerId,
        providerName: this.name,
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Run AML check
   */
  async runAMLCheck(request: {
    firstName: string
    lastName: string
    dateOfBirth?: string
    country?: string
  }): Promise<AMLCheckResult> {
    try {
      const timestamp = new Date().toISOString()
      const signature = await this.generateSignature(timestamp)

      const response = await fetch(`${SMILE_ID_BASE_URL}/aml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: this.partnerId,
          timestamp,
          signature,
          name: `${request.firstName} ${request.lastName}`,
          dob: request.dateOfBirth,
          countries: request.country ? [request.country] : ['KE'],
        }),
      })

      if (!response.ok) {
        return {
          status: 'ERROR',
          details: { error: response.statusText },
        }
      }

      const data = await response.json()

      if (data.matches && data.matches.length > 0) {
        return {
          status: 'FLAGGED',
          flags: data.matches.map((m: { name: string }) => m.name),
          riskLevel: 'HIGH',
          details: data,
        }
      }

      return {
        status: 'CLEAR',
        riskLevel: 'LOW',
        details: data,
      }
    } catch (error) {
      console.error('Smile ID AML check error:', error)
      return {
        status: 'ERROR',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      }
    }
  }

  /**
   * Handle webhook callback
   */
  async handleWebhook(payload: unknown): Promise<KYCVerificationResult | null> {
    try {
      const data = payload as SmileJobResult

      if (!data.SmileJobID) {
        return null
      }

      return this.parseJobResult(data)
    } catch (error) {
      console.error('Smile ID webhook error:', error)
      return null
    }
  }

  /**
   * Parse Smile ID job result
   */
  private parseJobResult(data: SmileJobResult): KYCVerificationResult {
    const resultCode = data.ResultCode
    const confidence = parseInt(data.ConfidenceValue || '0', 10)

    let status: KYCVerificationResult['status'] = 'PENDING'

    // Smile ID result codes
    // 0810 - Job completed successfully
    // 0811 - Job is still processing
    // 0812 - Job failed
    if (resultCode === '0810') {
      status = confidence >= 70 ? 'VERIFIED' : 'REJECTED'
    } else if (resultCode === '0812') {
      status = 'REJECTED'
    } else if (resultCode === '0811') {
      status = 'PENDING'
    } else {
      status = 'ERROR'
    }

    return {
      providerId: data.SmileJobID,
      providerName: this.name,
      status,
      score: confidence,
      result: data.ResultText,
      message: data.ResultText,
      details: data.Actions,
      verifiedAt: status === 'VERIFIED' ? new Date() : undefined,
    }
  }

  /**
   * Map ID type to Smile ID format
   */
  private mapIdType(idType: string): string {
    const mapping: Record<string, string> = {
      NATIONAL_ID: 'NATIONAL_ID',
      PASSPORT: 'PASSPORT',
      DRIVERS_LICENSE: 'DRIVERS_LICENSE',
    }
    return mapping[idType] || 'NATIONAL_ID'
  }
}

// Factory function
export function createSmileIdProvider(): SmileIdProvider | null {
  const apiKey = process.env.SMILE_ID_API_KEY
  const partnerId = process.env.SMILE_ID_PARTNER_ID
  const callbackUrl = process.env.SMILE_ID_CALLBACK_URL

  if (!apiKey || !partnerId) {
    console.warn('Smile ID not configured: Missing API key or partner ID')
    return null
  }

  return new SmileIdProvider({
    apiKey,
    partnerId,
    callbackUrl,
  })
}
