import { IsDateString, IsString } from 'class-validator';

export class AppointmentDto {
    @IsDateString()
    date: Date;

    @IsDateString()
    startTime: Date;

    @IsDateString()
    endTime: Date;

    @IsString()
    serviceId: string
}