import { Controller, Post, Body, Get, Param, Put, Delete } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServiceDto } from 'src/dto/service.dto';

@Controller('services')
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) { }

    @Post('create-service')
    createService(@Body() serviceDto: ServiceDto) {
        return this.servicesService.createService(serviceDto);
    }

    @Get('all-services')
    getServices() {
        return this.servicesService.getServices();
    }

    @Get('get-service/:id')
    getService(@Param('id') id: string) {
        return this.servicesService.getService(id);
    }

    @Put('update-service/:id')
    updateService(@Param('id') id: string, @Body() serviceDto: ServiceDto) {
        return this.servicesService.updateService(id, serviceDto);
    }

    @Delete('delete-service/:id')
    deleteService(@Param('id') id: string) {
        return this.servicesService.deleteService(id);
    }
}
