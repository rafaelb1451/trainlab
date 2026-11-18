import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '../api/endpoints'
import {
  clearStoredAuth,
  getStoredUser,
  getToken,
  storeSession,
  storeUser,
} from '../api/client'
import type { User } from '../api/types'

interface AuthContextValue {
  user: User | null
  token: string | null
  initializing: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken())
  const [user, setUser] = useState<User | null>(() => getStoredUser())
  const [initializing, setInitializing] = useState<boolean>(() => getToken() !== null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!token) {
      setInitializing(false)
      return
    }

    let active = true
    setInitializing(true)

    authApi
      .me()
      .then((me) => {
        if (!active) return
        setUser(me)
        storeUser(me)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          clearStoredAuth()
          setUser(null)
          setToken(null)
        }
        // Em falha de rede mantemos a sessão em cache e deixamos cada tela
        // mostrar seu próprio estado de erro.
      })
      .finally(() => {
        if (active) setInitializing(false)
      })

    return () => {
      active = false
    }
  }, [token])

  const login = useCallback((newToken: string, newUser: User) => {
    storeSession(newToken, newUser)
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    clearStoredAuth()
    setToken(null)
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, initializing, login, logout }),
    [user, token, initializing, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }
  return context
}
