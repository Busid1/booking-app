import { Controller, Post, Body, Get, UseInterceptors, UploadedFiles, Delete, Query } from '@nestjs/common';
import { BusinessInfoService } from './business-info.service';
import { BusinessInfoDto } from '../dto/business-info.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { deleteFromCloudinary, uploadToCloudinary } from '../cloudinary/uploadImage';
import * as multer from 'multer';

@Controller('business-info')
export class BusinessInfoController {
    constructor(private readonly businessInfoService: BusinessInfoService) { }

    @Post('save')
    @UseInterceptors(FilesInterceptor('images', 3, { storage: multer.memoryStorage() }))
    async saveBusinessInfo(
        @Body() businessInfoDto: BusinessInfoDto,
        @UploadedFiles() files?: Express.Multer.File[]
    ) {
        let newUrls: string[] = [];

        if (files && files.length > 0) {
            newUrls = await Promise.all(files.map(file => uploadToCloudinary(file.buffer, 'businessImages')));
            businessInfoDto.images = newUrls;
        }

        return this.businessInfoService.saveBusinessInfo(businessInfoDto);
    }

    @Post('images')
    @UseInterceptors(FilesInterceptor('images', 3, { storage: multer.memoryStorage() }))
    async updateImages(@UploadedFiles() files?: Express.Multer.File[]) {
        if (!files || files.length === 0) return;

        const urls = await Promise.all(files.map(file => uploadToCloudinary(file.buffer, 'businessImages')));
        return this.businessInfoService.updateImages(urls);
    }

    @Delete('delete-image')
    async deleteImage(@Query('url') url: string) {
        await deleteFromCloudinary(url);

        return this.businessInfoService.removeBusinessImage(url);
    }

    @Get('get')
    getBusinessInfo() {
        return this.businessInfoService.getBusinessInfo();
    }
}