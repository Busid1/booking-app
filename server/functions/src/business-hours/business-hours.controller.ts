import { Controller, Post, Body, Get, ParseArrayPipe } from '@nestjs/common';
import { BusinessHoursService } from './business-hours.service';
import { BusinessHoursDto } from '../dto/business-hours.dto';
import { AdminOnly } from '../auth/admin.guard';

@Controller('business-hours')
export class BusinessHoursController {
    constructor(private readonly businessHoursService: BusinessHoursService) { }

    @Post('save')
    @AdminOnly()
    saveBusinessHours(@Body(new ParseArrayPipe({ items: BusinessHoursDto })) businessHoursDto: BusinessHoursDto[]) {
        return this.businessHoursService.saveBusinessHours(businessHoursDto);
    }

    @Get('get')
    getBusinessHours() {
        return this.businessHoursService.getBusinessHours();
    }
}
