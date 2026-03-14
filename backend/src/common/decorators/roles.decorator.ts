import { SetMetadata } from '@nestjs/common';

export type UserRole = 'admin' | 'asesor_tecnico' | 'asesor_comercial' | 'cliente';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
