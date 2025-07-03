import { IsString } from 'class-validator';

export class AppointmentDto {
    @IsString()
    date: string;

    @IsString()
    startTime: string;

    @IsString()
    endTime: string;

    @IsString()
    serviceId: string
}