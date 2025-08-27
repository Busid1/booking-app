import { IsString } from 'class-validator';

export class BusinessInfoDto {
    @IsString()
    name: string;

    @IsString()
    description: string;
    
    @IsString()
    address: string;

    @IsString()
    phone: string;

    @IsString()
    email: string;

    @IsString()
    images: string[];
}