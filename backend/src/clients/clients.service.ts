import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: ListClientsQueryDto) {
    const organizationId = this.requireOrganizationId(user);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.advisorId ? { assignedAdvisorId: query.advisorId } : {}),
      ...(query.speciesType
        ? {
            farms: {
              some: {
                speciesType: query.speciesType,
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { companyName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          _count: {
            select: {
              farms: true,
              cases: true,
              visits: true,
            },
          },
          farms: {
            select: {
              id: true,
              name: true,
              speciesType: true,
            },
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async create(user: AuthUser, dto: CreateClientDto) {
    const organizationId = this.requireOrganizationId(user);

    return this.prisma.client.create({
      data: {
        organizationId,
        fullName: dto.fullName.trim(),
        phone: this.cleanOptional(dto.phone),
        email: this.cleanOptional(dto.email)?.toLowerCase(),
        companyName: this.cleanOptional(dto.companyName),
        address: this.cleanOptional(dto.address),
        assignedAdvisorId: this.cleanOptional(dto.assignedAdvisorId),
        notes: this.cleanOptional(dto.notes),
      },
      include: {
        _count: {
          select: {
            farms: true,
            cases: true,
            visits: true,
          },
        },
      },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const organizationId = this.requireOrganizationId(user);
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        farms: {
          orderBy: [{ createdAt: 'desc' }],
        },
        cases: {
          orderBy: [{ createdAt: 'desc' }],
          take: 10,
          include: {
            messages: {
              select: { id: true },
            },
          },
        },
        visits: {
          orderBy: [{ visitDate: 'desc' }],
          take: 10,
        },
        _count: {
          select: {
            farms: true,
            cases: true,
            visits: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Productor no encontrado');
    }

    return client;
  }

  async update(user: AuthUser, id: string, dto: UpdateClientDto) {
    await this.ensureClientBelongsToOrganization(user, id);

    return this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: this.cleanOptional(dto.phone) } : {}),
        ...(dto.email !== undefined
          ? { email: this.cleanOptional(dto.email)?.toLowerCase() }
          : {}),
        ...(dto.companyName !== undefined
          ? { companyName: this.cleanOptional(dto.companyName) }
          : {}),
        ...(dto.address !== undefined ? { address: this.cleanOptional(dto.address) } : {}),
        ...(dto.assignedAdvisorId !== undefined
          ? { assignedAdvisorId: this.cleanOptional(dto.assignedAdvisorId) }
          : {}),
        ...(dto.notes !== undefined ? { notes: this.cleanOptional(dto.notes) } : {}),
      },
      include: {
        _count: {
          select: {
            farms: true,
            cases: true,
            visits: true,
          },
        },
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.ensureClientBelongsToOrganization(user, id);

    return this.prisma.client.update({
      where: { id },
      data: {
        status: 'inactive',
      },
    });
  }

  async getSummary(user: AuthUser, id: string) {
    const organizationId = this.requireOrganizationId(user);
    const client = await this.ensureClientBelongsToOrganization(user, id);

    const [openCases, totalCases, totalVisits, lastVisit, farmSpecies] =
      await this.prisma.$transaction([
        this.prisma.case.count({
          where: {
            organizationId,
            clientId: id,
            status: {
              not: 'closed',
            },
          },
        }),
        this.prisma.case.count({
          where: {
            organizationId,
            clientId: id,
          },
        }),
        this.prisma.technicalVisit.count({
          where: {
            organizationId,
            clientId: id,
          },
        }),
        this.prisma.technicalVisit.findFirst({
          where: {
            organizationId,
            clientId: id,
          },
          orderBy: {
            visitDate: 'desc',
          },
          select: {
            visitDate: true,
            advisorId: true,
            farmId: true,
          },
        }),
        this.prisma.farm.findMany({
          where: {
            organizationId,
            clientId: id,
          },
          select: {
            speciesType: true,
          },
        }),
      ]);

    const speciesBreakdownMap = farmSpecies.reduce<Record<string, number>>(
      (acc, farm) => {
        acc[farm.speciesType] = (acc[farm.speciesType] ?? 0) + 1;
        return acc;
      },
      {},
    );

    return {
      client: {
        id: client.id,
        fullName: client.fullName,
        companyName: client.companyName,
        status: client.status,
      },
      metrics: {
        farms: client._count.farms,
        openCases,
        totalCases,
        totalVisits,
      },
      speciesBreakdown: Object.entries(speciesBreakdownMap).map(
        ([speciesType, count]) => ({
          speciesType,
          count,
        }),
      ),
      lastVisit,
    };
  }

  private async ensureClientBelongsToOrganization(user: AuthUser, id: string) {
    const organizationId = this.requireOrganizationId(user);
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        _count: {
          select: {
            farms: true,
            cases: true,
            visits: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Productor no encontrado');
    }

    return client;
  }

  private requireOrganizationId(user: AuthUser) {
    if (!user.organizationId) {
      throw new ForbiddenException(
        'El usuario autenticado no tiene organización asociada',
      );
    }

    return user.organizationId;
  }

  private cleanOptional(value?: string | null) {
    if (value === undefined || value === null) return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
