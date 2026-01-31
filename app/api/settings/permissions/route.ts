import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rolePermissions as defaultRolePermissions, Permission } from '@/lib/permissions'

// GET /api/settings/permissions - Get role permissions
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to get custom permissions from database
    const customPermissions = await prisma.systemSetting.findUnique({
      where: { key: 'role_permissions' },
    })

    if (customPermissions) {
      return NextResponse.json({
        rolePermissions: JSON.parse(customPermissions.value),
        isCustom: true,
      })
    }

    // Return default permissions
    const permissions: Record<string, string[]> = {}
    for (const [role, perms] of Object.entries(defaultRolePermissions)) {
      permissions[role] = perms as string[]
    }

    return NextResponse.json({
      rolePermissions: permissions,
      isCustom: false,
    })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
  }
}

// PUT /api/settings/permissions - Update role permissions
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can modify permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { rolePermissions } = body

    // Ensure ADMIN always has all permissions
    rolePermissions['ADMIN'] = Object.values(Permission)

    // Save to database
    await prisma.systemSetting.upsert({
      where: { key: 'role_permissions' },
      update: {
        value: JSON.stringify(rolePermissions),
      },
      create: {
        category: 'security',
        key: 'role_permissions',
        value: JSON.stringify(rolePermissions),
        label: 'Role Permissions',
        description: 'Custom role-based permissions configuration',
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_PERMISSIONS',
        entityType: 'SystemSetting',
        entityId: 'role_permissions',
        details: JSON.stringify({ modifiedRoles: Object.keys(rolePermissions) }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating permissions:', error)
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
  }
}
