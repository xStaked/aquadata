import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class ListClientsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @Transform(normalizeString)
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filtra por asesor asignado' })
  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  advisorId?: string;

  @ApiPropertyOptional({ enum: ['poultry', 'swine'] })
  @Transform(normalizeString)
  @IsOptional()
  @IsIn(['poultry', 'swine'])
  speciesType?: string;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre, empresa o email' })
  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  search?: string;
}
