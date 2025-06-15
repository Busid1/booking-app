import {
  IsString,
  IsBoolean,
  IsNumber,
  ValidateNested,
  IsArray
} from 'class-validator';
import { Type } from 'class-transformer';

export class TimeBlockDto {
  @IsString()
  openTime: string;

  @IsString()
  closeTime: string;
}

export class BusinessHoursDto {
  @IsNumber()
  dayOfWeek: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeBlockDto)
  timeBlocks: TimeBlockDto[];

  @IsBoolean()
  isClosed: boolean;
}
