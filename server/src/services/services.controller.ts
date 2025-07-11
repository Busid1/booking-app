import { Controller, Post, Body, Get, Param, Put, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServiceDto } from 'src/dto/service.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { uploadToCloudinary } from 'src/cloudinary/uploadImage';
import * as multer from 'multer';

@Controller('services')
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) { }

    @Post('create-service')
    @UseInterceptors(FileInterceptor('image', { storage: multer?.memoryStorage() }))
    async createService(@Body() serviceDto: ServiceDto, @UploadedFile() file: Express.Multer.File) {
        const url = await uploadToCloudinary(file.buffer, 'services');
        serviceDto.image = url;

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
    @UseInterceptors(FileInterceptor('image', { storage: multer?.memoryStorage() }))
    async updateService(
        @Param('id') id: string,
        @Body() serviceDto: ServiceDto,
        @UploadedFile() file?: Express.Multer.File
    ) {
        if (file) {
            const url = await uploadToCloudinary(file.buffer, 'services');
            serviceDto.image = url;
        }

        return this.servicesService.updateService(id, serviceDto);
    }

    @Delete('delete-service/:id')
    deleteService(@Param('id') id: string) {
        return this.servicesService.deleteService(id);
    }
}
