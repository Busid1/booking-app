import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  /** Para usuarios con cuenta. */
  @IsOptional()
  @IsString()
  appointmentId?: string;

  /** Para invitados (código de gestión de la cita). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manageToken?: string;
}

export class UpdateReviewDto {
  @IsBoolean()
  visible: boolean;
}
