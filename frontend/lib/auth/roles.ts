export type UserRole = 'admin' | 'asesor_tecnico' | 'asesor_comercial' | 'cliente'

export const ADMIN_ROLES: UserRole[] = ['admin', 'asesor_tecnico', 'asesor_comercial']
export const CLIENT_ROLE: UserRole = 'cliente'

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role as UserRole)
}

export function isClientRole(role: string | null | undefined): boolean {
  return role === CLIENT_ROLE
}
