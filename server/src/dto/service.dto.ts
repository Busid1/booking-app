import { IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ServiceDto {
  @IsString()
  title: string;

  @IsNumber()
  @Type(() => Number)
  price: number;

  @IsString()
  description: string;

  @IsString()
  image: string;

  @IsNumber()
  @Type(() => Number)
  duration: number;
}