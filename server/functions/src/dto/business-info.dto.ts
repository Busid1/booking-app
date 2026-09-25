import { IsString, MaxLength } from 'class-validator';

export class BusinessInfoDto {
    @IsString()
    @MaxLength(100)
    name: string;

    @IsString()
    @MaxLength(2000)
    description: string;

    @IsString()
    @MaxLength(200)
    address: string;

    @IsString()
    @MaxLength(40)
    phone: string;

    @IsString()
    @MaxLength(120)
    email: string;
}
