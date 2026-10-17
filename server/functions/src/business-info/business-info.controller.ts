import { Controller, Post, Body, Get, UseInterceptors, UploadedFiles, Delete, Query, BadRequestException } from '@nestjs/common';
import { BusinessInfoService } from './business-info.service';
import { BusinessInfoDto } from '../dto/business-info.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { deleteFromCloudinary, imageUploadOptions, uploadToCloudinary } from '../cloudinary/uploadImage';
import { AdminOnly } from '../auth/admin.guard';

@Controller('business-info')
export class BusinessInfoController {
    constructor(private readonly businessInfoService: BusinessInfoService) { }

    @Post('save')
    @AdminOnly()
    @UseInterceptors(FilesInterceptor('images', 0))
    saveBusinessInfo(@Body() businessInfoDto: BusinessInfoDto) {
        return this.businessInfoService.saveBusinessInfo(businessInfoDto);
    }

    @Post('images')
    @AdminOnly()
    @UseInterceptors(FilesInterceptor('images', BusinessInfoService.MAX_IMAGES, imageUploadOptions))
    async updateImages(@UploadedFiles() files?: Express.Multer.File[]) {
        if (!files?.length) throw new BadRequestException('No se ha enviado ninguna imagen');
        await this.businessInfoService.assertImageCapacity(files.length);

        const urls = await Promise.all(files.map(file => uploadToCloudinary(file.buffer, 'businessImages')));
        return this.businessInfoService.addImages(urls);
    }

    @Delete('delete-image')
    @AdminOnly()
    async deleteImage(@Query('url') url: string) {
        if (!url) throw new BadRequestException('Falta la url de la imagen');
        await deleteFromCloudinary(url).catch(() => undefined);
        return this.businessInfoService.removeBusinessImage(url);
    }

    @Get('get')
    getBusinessInfo() {
        return this.businessInfoService.getBusinessInfo();
    }
}
