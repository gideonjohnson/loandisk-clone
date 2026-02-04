import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcrypt'

/**
 * Authorized admin emails with permanent (lifetime) access
 */
const LIFETIME_ACCESS_EMAILS = [
  'gideonbosiregj@gmail.com',
  'jnyaox@gmail.com',
  'jobgateri563@gmail.com',
]

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        sessionDuration: { label: 'Session Duration', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password || !user.active) {
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        // Lifetime access for authorized admins (365 days), otherwise use selected duration
        const isLifetimeUser = LIFETIME_ACCESS_EMAILS.includes(user.email.toLowerCase())

        let sessionExpiry: number
        if (isLifetimeUser) {
          sessionExpiry = Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
        } else {
          const durationHours = parseInt(credentials.sessionDuration || '24', 10)
          const validDurations = [6, 12, 24]
          const hours = validDurations.includes(durationHours) ? durationHours : 24
          sessionExpiry = Date.now() + hours * 60 * 60 * 1000
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          sessionExpiry
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.sessionExpiry = user.sessionExpiry
        token.mustChangePassword = user.mustChangePassword
      }
      // Handle session update (e.g., after password change)
      if (trigger === 'update' && session?.mustChangePassword !== undefined) {
        token.mustChangePassword = session.mustChangePassword
      }
      // Check if session has expired
      if (token.sessionExpiry && Date.now() > (token.sessionExpiry as number)) {
        return { ...token, expired: true }
      }
      return token
    },
    async session({ session, token }) {
      if (token.expired) {
        throw new Error('Session expired')
      }
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.mustChangePassword = token.mustChangePassword as boolean
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 365 * 24 * 60 * 60 // Max 1 year (actual expiry controlled by sessionExpiry in token)
  },
  secret: process.env.NEXTAUTH_SECRET
}
