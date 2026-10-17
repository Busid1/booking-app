import { IsBoolean, IsInt, Max, Min, ValidateNested, IsArray, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { TIME_REGEX } from '../common/time.utils';

export class TimeBlockDto {
  @Matches(TIME_REGEX, { message: 'La hora de apertura debe tener el formato HH:mm' })
  openTime: string;

  @Matches(TIME_REGEX, { message: 'La hora de cierre debe tener el formato HH:mm' })
  closeTime: string;
}

export class BusinessHoursDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeBlockDto)
  timeBlocks: TimeBlockDto[];

  @IsBoolean()
  isClosed: boolean;
}
