import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { auth as authApi } from "@/lib/api"
import type { Session, SignupResult } from "@/types"

interface AuthContextValue {
  session: Session | null
  loading: boolean
  login: (email: string, password: string) => Promise<Session>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  hasPermission: (key: string) => boolean
  signup: (input: { workspace_name: string; name: string; email: string; password: string }) => Promise<SignupResult>
  verifyEmail: (token: string) => Promise<Session>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me()
      setSession(me)
    } catch {
      setSession(null)
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback<AuthContextValue["login"]>(async (email, password) => {
    const s = await authApi.login(email, password)
    setSession(s)
    return s
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {})
    setSession(null)
  }, [])

  const signup = useCallback<AuthContextValue["signup"]>(async (input) => {
    return authApi.signup(input)
  }, [])

  const verifyEmail = useCallback<AuthContextValue["verifyEmail"]>(async (token) => {
    const s = await authApi.verifyEmail(token)
    setSession(s)
    return s
  }, [])

  const hasPermission = useCallback(
    (key: string) => {
      if (!session) return false
      return session.permissions.includes("*") || session.permissions.includes(key)
    },
    [session]
  )

  return (
    <AuthContext.Provider
      value={{ session, loading, login, logout, refresh, hasPermission, signup, verifyEmail }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
