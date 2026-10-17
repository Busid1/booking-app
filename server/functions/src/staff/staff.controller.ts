import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StaffService } from './staff.service';
import { StaffDto } from '../dto/staff.dto';
import { AdminOnly, StaffOrAdmin } from '../auth/admin.guard';
import { GetUser } from '../auth/get-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { deleteFromCloudinary, imageUploadOptions, uploadToCloudinary } from '../cloudinary/uploadImage';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findPublic() {
    return this.staffService.findPublic();
  }

  @Get('all')
  @AdminOnly()
  findAll() {
    return this.staffService.findAllAdmin();
  }

  /** Ficha del trabajador vinculado a la cuenta actual. */
  @Get('me')
  @StaffOrAdmin()
  me(@GetUser() user: AuthUser) {
    return this.staffService.findByUser(user.id);
  }

  @Post()
  @AdminOnly()
  create(@Body() dto: StaffDto) {
    return this.staffService.create(dto);
  }

  @Put(':id')
  @AdminOnly()
  update(@Param('id') id: string, @Body() dto: StaffDto) {
    return this.staffService.update(id, dto);
  }

  @Post(':id/photo')
  @AdminOnly()
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  async uploadPhoto(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se ha recibido la imagen');
    const url = await uploadToCloudinary(file.buffer, 'staff');
    const { previous, staff } = await this.staffService.setPhoto(id, url);
    if (previous) await deleteFromCloudinary(previous).catch(() => undefined);
    return staff;
  }

  @Delete(':id/photo')
  @AdminOnly()
  async removePhoto(@Param('id') id: string) {
    const { previous, staff } = await this.staffService.setPhoto(id, null);
    if (previous) await deleteFromCloudinary(previous).catch(() => undefined);
    return staff;
  }

  @Delete(':id')
  @AdminOnly()
  async remove(@Param('id') id: string) {
    const removed = await this.staffService.remove(id);
    if (removed.photo) await deleteFromCloudinary(removed.photo).catch(() => undefined);
    return { success: true };
  }
}
