import { Controller, Post, Body, Get, Param, Put, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServiceDto } from '../dto/service.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { deleteFromCloudinary, imageUploadOptions, uploadToCloudinary } from '../cloudinary/uploadImage';
import { AdminOnly } from '../auth/admin.guard';

@Controller('services')
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) { }

    @Post('create-service')
    @AdminOnly()
    @UseInterceptors(FileInterceptor('image', imageUploadOptions))
    async createService(@Body() serviceDto: ServiceDto, @UploadedFile() file?: Express.Multer.File) {
        serviceDto.image = file ? await uploadToCloudinary(file.buffer, 'services') : null;
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
    @AdminOnly()
    @UseInterceptors(FileInterceptor('image', imageUploadOptions))
    async updateService(
        @Param('id') id: string,
        @Body() serviceDto: ServiceDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const previous = await this.servicesService.getService(id);
        // Solo se cambia la imagen si se sube una nueva.
        serviceDto.image = file ? await uploadToCloudinary(file.buffer, 'services') : undefined;

        const updated = await this.servicesService.updateService(id, serviceDto);
        if (file && previous.image) await deleteFromCloudinary(previous.image).catch(() => undefined);
        return updated;
    }

    @Delete('delete-service/:id')
    @AdminOnly()
    async deleteService(@Param('id') id: string) {
        const deleted = await this.servicesService.deleteService(id);
        if (deleted.image) await deleteFromCloudinary(deleted.image).catch(() => undefined);
        return { success: true };
    }
}
