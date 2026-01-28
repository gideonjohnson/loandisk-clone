/**
 * CSRF Protection
 * Provides token-based CSRF protection for forms and API calls
 */

import { cookies } from 'next/headers'

const CSRF_TOKEN_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_LENGTH = 32

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Get or create CSRF token
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies()
  let token = cookieStore.get(CSRF_TOKEN_NAME)?.value

  if (!token) {
    token = generateToken()
    cookieStore.set(CSRF_TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })
  }

  return token
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true
  }

  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_TOKEN_NAME)?.value

  if (!cookieToken) {
    return false
  }

  // Check header first (for API calls)
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  if (headerToken && timingSafeEqual(headerToken, cookieToken)) {
    return true
  }

  // Check form data (for form submissions)
  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const clonedRequest = request.clone()
      const body = await clonedRequest.json()
      if (body._csrf && timingSafeEqual(body._csrf, cookieToken)) {
        return true
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const clonedRequest = request.clone()
      const formData = await clonedRequest.formData()
      const formToken = formData.get('_csrf')?.toString()
      if (formToken && timingSafeEqual(formToken, cookieToken)) {
        return true
      }
    }
  } catch {
    // Parsing failed, token not valid
  }

  return false
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * CSRF protection middleware wrapper
 */
export function withCSRFProtection<T>(
  handler: (request: Request, ...args: unknown[]) => Promise<T>
) {
  return async (request: Request, ...args: unknown[]): Promise<T | Response> => {
    const isValid = await validateCSRFToken(request)

    if (!isValid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid CSRF token',
          message: 'Your session may have expired. Please refresh the page and try again.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return handler(request, ...args)
  }
}

/**
 * Get CSRF token for client-side use
 */
export async function getClientCSRFToken(): Promise<string> {
  return await getCSRFToken()
}
