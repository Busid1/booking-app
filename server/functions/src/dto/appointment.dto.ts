import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { DATE_REGEX, TIME_REGEX } from '../common/time.utils';

export class AppointmentDto {
    @Matches(DATE_REGEX, { message: 'La fecha debe tener el formato YYYY-MM-DD' })
    date: string;

    @Matches(TIME_REGEX, { message: 'La hora de inicio debe tener el formato HH:mm' })
    startTime: string;

    // Se recalcula en el servidor a partir de la duración del servicio.
    @IsOptional()
    @IsString()
    endTime?: string;

    @IsString()
    @IsNotEmpty({ message: 'Debes seleccionar un servicio' })
    serviceId: string;

    /** Id del trabajador, 'any' para cualquiera disponible, o vacío. */
    @IsOptional()
    @IsString()
    @MaxLength(64)
    staffId?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(80)
    clientName?: string;

    @IsOptional()
    @ValidateIf((_o, v) => v !== '' && v !== null)
    @IsEmail({}, { message: 'El email no es válido' })
    @MaxLength(120)
    clientEmail?: string;

    @IsOptional()
    @ValidateIf((_o, v) => v !== '' && v !== null)
    @Matches(/^\+?[0-9\s().-]{6,20}$/, { message: 'El teléfono no es válido' })
    clientPhone?: string;

    /** Token de Cloudflare Turnstile (solo reservas de invitados). */
    @IsOptional()
    @IsString()
    @MaxLength(4096)
    turnstileToken?: string;
}

export class ManageTokensDto {
    @IsString({ each: true })
    @MaxLength(100, { each: true })
    tokens: string[];
}
