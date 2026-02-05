import { getServerSession, Session } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { Permission, UserRole, hasPermission, hasAllPermissions } from '@/lib/permissions'

interface RouteContext {
  params: Record<string, string>
}

interface NextJsRouteContext {
  params: Promise<Record<string, string>>
}

/**
 * Middleware to protect API routes with authentication and permission checks
 * @param requiredPermissions Array of permissions required to access the route
 * @param requireAll If true, user must have ALL permissions. If false, user needs at least ONE
 * @returns Middleware function
 */
export function withAuth(
  requiredPermissions: Permission[] = [],
  requireAll: boolean = false
) {
  return async function middleware(
    request: Request,
    context: RouteContext,
    handler: (request: Request, session: Session, context: RouteContext) => Promise<NextResponse>
  ) {
    try {
      // Get the current session
      const session = await getServerSession(authOptions)

      // Check if user is authenticated
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'You must be logged in to access this resource' },
          { status: 401 }
        )
      }

      // If no specific permissions required, just check authentication
      if (requiredPermissions.length === 0) {
        return handler(request, session, context)
      }

      // Check permissions
      const userRole = session.user.role as UserRole

      let hasRequiredPermissions = false

      if (requireAll) {
        // User must have ALL permissions
        hasRequiredPermissions = hasAllPermissions(userRole, requiredPermissions)
      } else {
        // User needs at least ONE permission
        hasRequiredPermissions = requiredPermissions.some(permission =>
          hasPermission(userRole, permission)
        )
      }

      if (!hasRequiredPermissions) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not have permission to access this resource',
            requiredPermissions,
            userRole,
          },
          { status: 403 }
        )
      }

      // User is authenticated and authorized
      return handler(request, session, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'An error occurred while processing your request' },
        { status: 500 }
      )
    }
  }
}

/**
 * Simple wrapper to create authenticated API handlers
 * @param handler The actual API handler function
 * @param requiredPermissions Permissions required
 * @param requireAll Whether all permissions are required
 */
export function createAuthHandler(
  handler: (request: Request, session: Session, context: RouteContext) => Promise<NextResponse>,
  requiredPermissions: Permission[] = [],
  requireAll: boolean = false
) {
  const middleware = withAuth(requiredPermissions, requireAll)

  return async (request: Request, nextJsContext?: NextJsRouteContext) => {
    // Await the params Promise from Next.js 15+ and convert to plain object
    const params = nextJsContext?.params ? await nextJsContext.params : {}
    const context: RouteContext = { params }
    return middleware(request, context, handler)
  }
}

/**
 * Check if the current session has a specific permission
 * Use this in API routes for inline permission checks
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role) return false

  return hasPermission(session.user.role as UserRole, permission)
}

/**
 * Get the current user's session with type safety
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user || null
}
