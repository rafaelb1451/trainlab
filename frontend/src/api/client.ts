import axios from 'axios'
import type { ApiErrorBody, User, UserRole } from './types'

/**
 * Sessao do usuario.
 *
 * O token NAO fica no navegador em localStorage: ele viaja num cookie HttpOnly emitido pelo
 * backend, que o JavaScript nao consegue ler. Aqui guardamos apenas o usuario (nome/papel),
 * que serve para montar a interface antes do /auth/me responder.
 */
const USER_STORAGE_KEY = 'trainlab.user'

function isUserRole(value: unknown): value is UserRole {
  return value === 'COACH' || value === 'ATHLETE'
}

function isStoredUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate['id'] === 'string' &&
    typeof candidate['name'] === 'string' &&
    typeof candidate['email'] === 'string' &&
    isUserRole(candidate['role'])
  )
}

export function getStoredUser(): User | null {
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isStoredUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function storeUser(user: User): void {
  try {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } catch {
    // localStorage indisponível (modo privado): a sessão continua enquanto a aba viver.
  }
}

export function clearStoredAuth(): void {
  try {
    window.localStorage.removeItem(USER_STORAGE_KEY)
  } catch {
    // ignora indisponibilidade do storage
  }
}

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // Envia e aceita o cookie de sessao HttpOnly.
  withCredentials: true,
  timeout: 20000,
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearStoredAuth()
      const path = window.location.pathname
      if (path !== '/login' && path !== '/register') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Não foi possível concluir a operação. Tente novamente.',
): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const status = error.response?.status
    const data = error.response?.data
    if (data?.message && data.message.trim().length > 0) {
      return data.message
    }
    if (!error.response) {
      return 'Não foi possível conectar ao servidor. Verifique se o backend está em execução e tente novamente.'
    }
    if (status === 400) return 'Dados inválidos. Revise as informações e tente novamente.'
    if (status === 401) return 'Sessão expirada. Entre novamente para continuar.'
    if (status === 403) return 'Você não tem permissão para acessar este recurso.'
    if (status === 404) return 'Recurso não encontrado.'
    if (status === 409) return data?.error ?? 'Já existe um registro com estes dados.'
    if (status !== undefined && status >= 500) {
      return 'O servidor encontrou um erro inesperado. Tente novamente em instantes.'
    }
    return fallback
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return fallback
}
