import { IsOptional, IsString } from 'class-validator';

export class AppointmentDto {
    @IsString()
    date: string;

    @IsString()
    startTime: string;

    @IsString()
    endTime: string;

    @IsString()
    serviceId: string

    @IsOptional()
    @IsString()
    clientName: string;
}