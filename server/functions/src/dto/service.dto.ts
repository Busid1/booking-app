import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, Max, MaxLength, IsArray, IsInt } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** En multipart los arrays llegan como JSON o separados por comas. */
function toStringArray({ value }: { value: unknown }): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map(String);
  const text = String(value).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch { /* separado por comas */ }
  return text.split(',').map(v => v.trim()).filter(Boolean);
}

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

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  /** Señal a cobrar online al reservar (0 = sin señal). */
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @IsNumber({}, { message: 'La señal debe ser un número' })
  @Min(0)
  deposit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  staffIds?: string[];
}

export class ReorderServicesDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
