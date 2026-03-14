import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async getProfile(user: AuthUser) {
    // El perfil base viene del guard (Supabase profiles)
    // Aquí podríamos enriquecer con datos adicionales si es necesario
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}
