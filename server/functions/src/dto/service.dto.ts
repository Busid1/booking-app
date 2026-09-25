import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ServiceDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del servicio es obligatorio' })
  @MaxLength(100)
  title: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'La duración debe ser un número' })
  @Min(5, { message: 'La duración mínima es de 5 minutos' })
  @Max(720, { message: 'La duración máxima es de 12 horas' })
  duration: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  image?: string | null;
}
