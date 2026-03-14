import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
@Roles('admin', 'asesor_tecnico', 'asesor_comercial')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productores con filtros y paginación' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListClientsQueryDto,
  ) {
    return this.clientsService.findAll(user, query);
  }

  @Post()
  @ApiOperation({ summary: 'Crear productor' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle del productor con granjas, casos y visitas recientes',
  })
  @ApiParam({ name: 'id', description: 'ID del productor' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.findOne(user, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar productor' })
  @ApiParam({ name: 'id', description: 'ID del productor' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete del productor (status = inactive)' })
  @ApiParam({ name: 'id', description: 'ID del productor' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.remove(user, id);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Obtener KPIs y resumen del productor' })
  @ApiParam({ name: 'id', description: 'ID del productor' })
  getSummary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.getSummary(user, id);
  }
}
