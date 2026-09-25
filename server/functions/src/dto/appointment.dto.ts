import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
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

    @IsOptional()
    @IsString()
    @MaxLength(80)
    clientName?: string;
}
