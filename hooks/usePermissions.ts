'use client'

import { useSession } from 'next-auth/react'
import { Permission, UserRole, hasPermission, hasAnyPermission, hasAllPermissions, getRolePermissions } from '@/lib/permissions'

/**
 * React hook for checking user permissions
 * @returns Object with permission checking methods
 */
export function usePermissions() {
  const { data: session } = useSession()

  const role = session?.user?.role as UserRole | undefined

  /**
   * Check if the current user has a specific permission
   * @param permission Permission to check
   * @returns true if user has permission
   */
  const can = (permission: Permission): boolean => {
    if (!role) return false
    return hasPermission(role, permission)
  }

  /**
   * Check if the current user has any of the specified permissions
   * @param permissions Array of permissions to check
   * @returns true if user has at least one permission
   */
  const canAny = (permissions: Permission[]): boolean => {
    if (!role) return false
    return hasAnyPermission(role, permissions)
  }

  /**
   * Check if the current user has all of the specified permissions
   * @param permissions Array of permissions to check
   * @returns true if user has all permissions
   */
  const canAll = (permissions: Permission[]): boolean => {
    if (!role) return false
    return hasAllPermissions(role, permissions)
  }

  /**
   * Get all permissions for the current user's role
   * @returns Array of permissions
   */
  const permissions = role ? getRolePermissions(role) : []

  return {
    role,
    can,
    canAny,
    canAll,
    permissions,
    isAuthenticated: !!session,
    user: session?.user,
  }
}
