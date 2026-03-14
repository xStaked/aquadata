import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export const FARM_SPECIES = ['poultry', 'swine'] as const;

export class CreateFarmDto {
  @ApiProperty({
    description: 'ID del productor dueño de la granja',
    example: '3c4e1e62-7684-4a35-a40d-3e20f1e9b787',
  })
  @IsUUID()
  clientId!: string;

  @ApiProperty({
    description: 'Nombre de la granja',
    example: 'Granja San Miguel',
  })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({
    enum: FARM_SPECIES,
    description: 'Especie principal atendida en la granja',
  })
  @IsString()
  @IsIn(FARM_SPECIES)
  speciesType!: 'poultry' | 'swine';

  @ApiPropertyOptional({
    description: 'Ubicación o referencia geográfica',
    example: 'Montería, Córdoba',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    description: 'Capacidad instalada de la granja',
    example: 12000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({
    description: 'ID del asesor asignado',
    example: 'c080a6c4-301e-4521-bf01-5d2a7f3e6b3b',
  })
  @IsOptional()
  @IsUUID()
  assignedAdvisorId?: string;
}
