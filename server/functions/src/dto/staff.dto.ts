import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { TimeBlockDto } from './business-hours.dto';

export class StaffHoursDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsBoolean()
  isClosed: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeBlockDto)
  timeBlocks: TimeBlockDto[];
}

export class StaffDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'El color debe tener el formato #RRGGBB' })
  color?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  useBusinessHours?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  calendarId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffHoursDto)
  hours?: StaffHoursDto[];

  /** Email de una cuenta registrada para darle acceso a su agenda ('' para quitarlo). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  accessEmail?: string;
}

