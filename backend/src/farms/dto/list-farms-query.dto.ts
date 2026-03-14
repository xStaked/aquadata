import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

const SPECIES_TYPES = ['poultry', 'swine'] as const;

export class ListFarmsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por productor',
    example: '3c4e1e62-7684-4a35-a40d-3e20f1e9b787',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    enum: SPECIES_TYPES,
    description: 'Filtrar por especie principal',
  })
  @IsOptional()
  @IsIn(SPECIES_TYPES)
  speciesType?: 'poultry' | 'swine';

  @ApiPropertyOptional({
    description: 'Filtrar por asesor asignado',
    example: 'c080a6c4-301e-4521-bf01-5d2a7f3e6b3b',
  })
  @IsOptional()
  @IsUUID()
  advisorId?: string;
}
