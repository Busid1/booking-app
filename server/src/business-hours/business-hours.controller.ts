import { Controller, Post, Body, Get, Param, Put, ValidationPipe } from '@nestjs/common';
import { BusinessHoursService } from './business-hours.service';
import { BusinessHoursDto } from 'src/dto/business-hours';

@Controller('business-hours')
export class BusinessHoursController {
    constructor(private readonly businessHoursService: BusinessHoursService) { }

    @Post('save')
    async saveBusinessHours(@Body() businessHoursDto: BusinessHoursDto[]) {
        return this.businessHoursService.saveBusinessHours(businessHoursDto);
    }

    @Get('get')
    getBusinessHours(){
        return this.businessHoursService.getBusinessHours();
    }
}
