import { UserRole } from '@prisma/client'
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    role: UserRole
    sessionExpiry?: number
    mustChangePassword?: boolean
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      mustChangePassword?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    id: string
    sessionExpiry?: number
    expired?: boolean
    mustChangePassword?: boolean
  }
}
