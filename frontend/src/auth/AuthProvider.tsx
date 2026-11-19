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
import { clearStoredAuth, getStoredUser, storeUser } from '../api/client'
import type { User } from '../api/types'

interface AuthContextValue {
  user: User | null
  initializing: boolean
  login: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Estado de sessao do front.
 *
 * A verdade sobre "estou logado?" esta no cookie HttpOnly, invisivel para o JavaScript.
 * Por isso o boot sempre consulta /auth/me: se o cookie for valido, o backend devolve o
 * usuario; se nao, seguimos como visitante. O usuario em localStorage serve so para pintar
 * a interface mais rapido enquanto essa resposta nao chega.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())
  const [initializing, setInitializing] = useState<boolean>(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

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
        }
        // Falha de rede: mantemos o usuario em cache e deixamos cada tela
        // mostrar seu proprio estado de erro.
      })
      .finally(() => {
        if (active) setInitializing(false)
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback((newUser: User) => {
    storeUser(newUser)
    setUser(newUser)
    setInitializing(false)
  }, [])

  const logout = useCallback(() => {
    // Apaga o cookie no servidor e limpa o cache do React Query junto.
    void authApi.logout().catch(() => undefined)
    clearStoredAuth()
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, login, logout }),
    [user, initializing, login, logout],
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
